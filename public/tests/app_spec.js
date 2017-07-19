
describe('LearnJS', () => {
  beforeEach(() => {
    learnjs.identity = {}
    learnjs.identity.promise = new Promise((resolve) => {
      learnjs.identity.resolve = resolve
    })
  })

  it('can show a problem view', () => {
    learnjs.showView('#problem-1')
    expect($('.view-container .problem-view').length).toEqual(1)
  })

  it('shows the landing page view when there is no hash', () => {
    learnjs.showView('')
    expect($('.view-container .landing-view').length).toEqual(1)
  })

  it('passes the hash view parameter to the view function', () => {
    spyOn(learnjs, 'problemView')
    learnjs.showView('#problem-42')
    expect(learnjs.problemView).toHaveBeenCalledWith('42')
  })

  it('triggers removeView event when removing the view', () => {
    spyOn(learnjs, 'triggerEvent')
    learnjs.showView('#problem-1')
    expect(learnjs.triggerEvent).toHaveBeenCalledWith('removingView', [])
  })

  it('invokes the router when loaded', () => {
    spyOn(learnjs, 'showView')
    learnjs.appOnReady()
    expect(learnjs.showView).toHaveBeenCalledWith(window.location.hash)
  })

  it('subscribes to the hash change event', () => {
    learnjs.appOnReady()
    spyOn(learnjs, 'showView')
    $(window).trigger('hashchange')
    expect(learnjs.showView).toHaveBeenCalledWith(window.location.hash)
  })

  it('can flash an element while setting the text', () => {
    const elem = $('<p>')
    spyOn(elem, 'fadeOut').and.callThrough()
    spyOn(elem, 'fadeIn')
    learnjs.flashElement(elem, 'new text')
    expect(elem.text()).toEqual('new text')
    expect(elem.fadeOut).toHaveBeenCalled()
    expect(elem.fadeIn).toHaveBeenCalled()
  })

  it('can redirect to the main view after the last problem is answered', () => {
    const flash = learnjs.buildCorrectFlash(learnjs.problems.length)
    expect(flash.find('a').attr('href')).toEqual('')
    expect(flash.find('a').text()).toEqual("You're Finished!")
  })

  it('can trigger events on the view', () => {
    const callback = jasmine.createSpy('callback')
    const div = $('<div>').bind('fooEvent', callback)
    $('.view-container').append(div)
    learnjs.triggerEvent('fooEvent', ['bar'])
    expect(callback).toHaveBeenCalled()
    expect(callback.calls.argsFor(0)[1]).toEqual('bar')
  })

  it('adds the profile link when the user logs in', (done) => {
    const identity = { email: 'foo@bar.com' }
    spyOn(learnjs, 'addProfileLink')
    learnjs.appOnReady()
    learnjs.identity.resolve(identity)
    learnjs.identity.promise.then(() => {
      expect(learnjs.addProfileLink).toHaveBeenCalledWith(identity)
      done()
    })
  })

  it('can append a profile view link to navbar', () => {
    learnjs.addProfileLink({ email: 'foo@bar.com' })
    expect($('.signin-bar a').attr('href')).toEqual('#profile')
  })

  describe('awsRefresh', () => {
    let fakeCreds

    beforeEach(() => {
      fakeCreds = jasmine.createSpyObj('creds', ['refreshPromise'])
      fakeCreds.identityId = 'COGNITO_ID'
      AWS.config.credentials = fakeCreds
    })

    it('returns a promise that resolve on success', (done) => {
      fakeCreds.refreshPromise.and.returnValue(Promise.resolve())
      learnjs.awsRefresh().then(() => {
        expect(fakeCreds.identityId).toEqual('COGNITO_ID')
        done()
      })
    })

    it('rejects the promise on a failure', (done) => {
      fakeCreds.refreshPromise.and.returnValue(Promise.reject('error'))
      learnjs.awsRefresh().catch((err) => {
        expect(err).toEqual('error')
        done()
      })
    })
  })

  describe('profile view', () => {
    let view

    beforeEach(() => {
      view = learnjs.profileView()
    })

    it('shows the user email address when they log in', (done) => {
      learnjs.identity.resolve({ email: 'foo@bar.com' })
      learnjs.identity.promise.then(() => {
        expect(view.find('.email').text()).toEqual('foo@bar.com')
        done()
      })
    })

    it('shows no email when the user is not logged in yet', () => {
      expect(view.find('.email').text()).toEqual('')
    })
  })

  describe('googleSignIn callback', () => {
    let user, profile

    beforeEach(() => {
      profile = jasmine.createSpyObj('profile', ['getEmail'])
      const refreshPromise = Promise.resolve('COGNITO_ID')
      spyOn(learnjs, 'awsRefresh').and.returnValue(refreshPromise)
      spyOn(AWS, 'CognitoIdentityCredentials')
      user = jasmine.createSpyObj('user', ['getAuthResponse', 'getBasicProfile'])
      user.getAuthResponse.and.returnValue({id_token: 'GOOGLE_ID'})
      user.getBasicProfile.and.returnValue(profile)
      profile.getEmail.and.returnValue('foo@bar.com')
      googleSignIn(user)
    })

    it('sets the AWS region', () => {
      expect(AWS.config.region).toEqual('ap-northeast-1')
    })

    it('sets the identity pool ID and Google ID token', () => {
      expect(AWS.CognitoIdentityCredentials).toHaveBeenCalledWith({
        IdentityPoolId: POOL_ID,
        Logins: {
          'accounts.google.com': 'GOOGLE_ID'
        }
      })
    })

    it('fetches the AWS credentials and resolved', (done) => {
      learnjs.identity.promise.then((identity) => {
        expect(identity.email).toEqual('foo@bar.com')
        expect(identity.id).toEqual('COGNITO_ID')
        done()
      })
    })

    describe('refresh', () => {
      let instanceSpy

      beforeEach(() => {
        AWS.config.credentials = { params: { Logins: {}}}
        const updateSpy = jasmine.createSpyObj('userUpdate', ['getAuthResponse'])
        updateSpy.getAuthResponse.and.returnValue({id_token: 'GOOGLE_ID'})
        instanceSpy = jasmine.createSpyObj('instance', ['signIn'])
        instanceSpy.signIn.and.returnValue(Promise.resolve(updateSpy))
        const auth2Spy = jasmine.createSpyObj('auth2', ['getAuthInstance'])
        auth2Spy.getAuthInstance.and.returnValue(instanceSpy)
        window.gapi = { auth2: auth2Spy }
      })

      it('returns a promise when token is refreshed', (done) => {
        learnjs.identity.promise.then((identity) => {
          identity.refresh().then(() => {
            expect(AWS.config.credentials.params.Logins).toEqual({
              'accounts.google.com': 'GOOGLE_ID'
            })
            done()
          })
        })
      })

      it('does not re-prompt for consent when refreshing the token in', (done) => {
        learnjs.identity.promise.then((identity) => {
          identity.refresh().then(() => {
            expect(instanceSpy.signIn).toHaveBeenCalledWith({prompt: 'login'})
            done()
          })
        })
      })
    })
  })

  describe('problem view', () => {
    let view

    beforeEach(() => {
      view = learnjs.problemView('1')
    })

    it('has a title that includes the problem number', () => {
      expect(view.find('.title').text()).toEqual('Problem #1')
    })

    it('shows the description', () => {
      expect(view.find("[data-name='description']").text()).toEqual('What is truth?')
    })

    it('shows the problem code', () => {
      expect(view.find("[data-name='code']").text()).toEqual('function problem() { return __; }')
    })

    describe('skip button', () => {
      it('is added to the navbar when the view is added', () => {
        expect($('.nav-list .skip-btn').length).toEqual(1)
      })

      it('is removed from the navbar when the view is removed', () => {
        view.trigger('removingView')
        expect($('.nav-list .skip-btn').length).toEqual(0)
      })

      it('contains a link to the next broblem', () => {
        expect($('.nav-list .skip-btn a').attr('href')).toEqual(('#problem-2'))
      })

      it('does not added when at the last problem', () => {
        view.trigger('removingView')
        view = learnjs.problemView(`${learnjs.problems.length}`)
        expect($('.nav-list .skip-btn').length).toEqual(0)
      })
    })

    describe('answer section', () => {
      let resultFlash

      beforeEach(() => {
        spyOn(learnjs, 'flashElement')
        resultFlash = view.find('.result')
      })

      describe('when the answer is correct', () => {

        beforeEach(() => {
          view.find('.answer').val('true')
          view.find('.check-btn').click()
        })

        it('flashes the result', () => {
          const flashArgs = learnjs.flashElement.calls.argsFor(0)
          expect(flashArgs[0]).toEqual(resultFlash)
          expect(flashArgs[1].find('span').text()).toEqual('Correct!')
        })

        it('shows a link to next problem', () => {
          const link = learnjs.flashElement.calls.argsFor(0)[1].find('a')
          expect(link.text()).toEqual('Next Problem')
          expect(link.attr('href')).toEqual('#problem-2')
        })
      })

      it('rejects an incorrect answer', () => {
        view.find('.answer').val('false')
        view.find('.check-btn').click()
        expect(learnjs.flashElement).toHaveBeenCalledWith(resultFlash, 'Incorrect!')
      })
    })
  })
})

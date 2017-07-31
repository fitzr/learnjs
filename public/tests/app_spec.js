
describe('LearnJS', () => {
  beforeEach(() => {
    learnjs.identity = new Promise(resolve => {
      learnjs.resolve = resolve
    })
  })

  describe('changing views', () => {
    it('can show a problem view', () => {
      learnjs.showView('#problem-1')
      expect($('.view-container .problem-view').length).toEqual(1)
    })

    it('dispatch removeView event when removing the view', () => {
      spyOn(learnjs, 'dispatchEvent')
      learnjs.showView('#problem-1')
      expect(learnjs.dispatchEvent).toHaveBeenCalledWith('removingView', {})
    })
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

  it('can listen events', () => {
    const callback = jasmine.createSpy('callback')
    learnjs.addEventListener('fooEvent', callback)
    learnjs.dispatchEvent('fooEvent', 'bar')
    expect(callback).toHaveBeenCalled()
    expect(callback.calls.argsFor(0)[0]).toEqual('bar')
  })

  it('set email to the profile link when the user logs in', () => {
    learnjs.addProfileLink()
    learnjs.setEmail('foo@bar.com')
    expect($('.signin-bar a').text()).toEqual('foo@bar.com')
  })

  it('can append a profile view link to navbar', () => {
    learnjs.addProfileLink({ email: 'foo@bar.com' })
    expect($('.signin-bar a').attr('href')).toEqual('#profile')
  })

  describe('widh DynamoDB', () => {
    let dbspy
    beforeEach(() => {
      dbspy = jasmine.createSpyObj('db', ['get', 'put'])
      spyOn(AWS.DynamoDB, 'DocumentClient').and.returnValue(dbspy)
      spyOn(learnjs, 'sendDbRequest')
      learnjs.resolve('COGNITO_ID')
    })

    describe('fetchAnswer', () => {
      beforeEach(() => {
        dbspy.get.and.returnValue('request')
      })

      it('reads the item from the database', (done) => {
        learnjs.sendDbRequest.and.returnValue(Promise.resolve('item'))
        learnjs.fetchAnswer(1).then((item) => {
          expect(item).toEqual('item')
          expect(learnjs.sendDbRequest).toHaveBeenCalledWith('request', jasmine.any(Function))
          expect(dbspy.get).toHaveBeenCalledWith({
            TableName: 'learnjs',
            Key: {
              userId: 'COGNITO_ID',
              problemId: 1,
            }
          })
          done()
        })
      })

      it('resubmits the request on retry', (done) => {
        learnjs.fetchAnswer(1, {answer: 'false'}).then(() => {
          spyOn(learnjs, 'fetchAnswer').and.returnValue('promise')
          expect(learnjs.sendDbRequest.calls.first().args[1]()).toEqual('promise')
          expect(learnjs.fetchAnswer).toHaveBeenCalledWith(1)
          done()
        })
      })
    })

    describe('saveAnswer', () => {
      beforeEach(() => {
        dbspy.put.and.returnValue('request')
      })

      it('writes the item to the database', (done) => {
        learnjs.saveAnswer(1, {}).then(() => {
          expect(learnjs.sendDbRequest).toHaveBeenCalledWith('request', jasmine.any(Function))
          expect(dbspy.put).toHaveBeenCalledWith({
            TableName: 'learnjs',
            Item: {
              userId: 'COGNITO_ID',
              problemId: 1,
              answer: {},
            }
          })
          done()
        })
      })

      it('resubmits the request on retry', (done) => {
        learnjs.saveAnswer(1, {answer: 'false'}).then(() => {
          spyOn(learnjs, 'saveAnswer').and.returnValue('promise')
          expect(learnjs.sendDbRequest.calls.first().args[1]()).toEqual('promise')
          expect(learnjs.saveAnswer).toHaveBeenCalledWith(1, {answer: 'false'})
          done()
        })
      })
    })
  })

  describe('sendDbRequest', () => {
    let request, requestHandlers, promise, retrySpy
    beforeEach(() => {
      spyOn(learnjs, 'googleRefresh').and.returnValue(Promise.resolve())
      requestHandlers = {}
      request = jasmine.createSpyObj('request', ['send', 'on'])
      request.on.and.callFake((eventName, callback) => {
        requestHandlers[eventName] = callback
      })
      retrySpy = jasmine.createSpy('retry')
      promise = learnjs.sendDbRequest(request, retrySpy)
    })

    it('resolves the returned promise on success', (done) => {
      requestHandlers.success({data: 'data'})
      expect(request.send).toHaveBeenCalled()
      promise.then((data) => {
        expect(data).toEqual('data')
        done()
      }, fail)
    })

    it('rejects the returned promise on error', (done) => {
      requestHandlers.error({code: 'SomeError'})
      promise.catch((resp) => {
        expect(resp).toEqual({code: 'SomeError'})
        done()
      })
    })

    it('refreshes the credentials and retries when the credentials are expired', (done) => {
      requestHandlers.error({code: 'CredentialsError'})
      learnjs.resolve('COGNITO_ID')
      promise.then(() => {
        expect(retrySpy).toHaveBeenCalled()
        done()
      })
    })
  })

  describe('awsRefresh', () => {
    let fakeCreds

    beforeEach(() => {
      fakeCreds = jasmine.createSpyObj('creds', ['refreshPromise'])
      fakeCreds.userId = 'COGNITO_ID'
      AWS.config.credentials = fakeCreds
    })

    it('returns a promise that resolve on success', (done) => {
      fakeCreds.refreshPromise.and.returnValue(Promise.resolve())
      learnjs.awsRefresh().then(() => {
        expect(fakeCreds.userId).toEqual('COGNITO_ID')
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
    it('shows the user email address when they log in', () => {
      learnjs.email = 'foo@bar.com'
      const view = learnjs.profileView()
      expect(view.find('.email').text()).toEqual('foo@bar.com')
    })

    it('shows no email when the user is not logged in yet', () => {
      learnjs.email = ''
      const view = learnjs.profileView()
      expect(view.find('.email').text()).toEqual('')
    })
  })

  describe('googleSignIn callback', () => {
    let user, profile, credentials

    beforeEach(() => {
      profile = jasmine.createSpyObj('profile', ['getEmail'])
      const refreshPromise = Promise.resolve('COGNITO_ID')
      spyOn(learnjs, 'awsRefresh').and.returnValue(refreshPromise)
      credentials = jasmine.createSpyObj('credentials', ['clearCachedId'])
      spyOn(AWS, 'CognitoIdentityCredentials').and.returnValue(credentials)
      user = jasmine.createSpyObj('user', ['getAuthResponse', 'getBasicProfile'])
      user.getAuthResponse.and.returnValue({id_token: 'GOOGLE_ID'})
      user.getBasicProfile.and.returnValue(profile)
      profile.getEmail.and.returnValue('foo@bar.com')
      learnjs.googleSignIn(user)
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

    it('clears the cached id', () => {
      expect(credentials.clearCachedId).toHaveBeenCalled()
    })

    it('fetches the AWS credentials and resolved', (done) => {
      learnjs.identity.then(id => {
        expect(id).toEqual('COGNITO_ID')
        expect(learnjs.email).toEqual('foo@bar.com')
        done()
      })
    })
  })

  describe('googleRefresh', () => {
    let instanceSpy, user

    beforeEach(() => {
      spyOn(learnjs, 'awsRefresh').and.returnValue(Promise.resolve('COGNITO_ID'))
      AWS.config.credentials = { params: { Logins: {}}}
      const updateSpy = jasmine.createSpyObj('userUpdate', ['getAuthResponse'])
      updateSpy.getAuthResponse.and.returnValue({id_token: 'GOOGLE_ID'})
      instanceSpy = jasmine.createSpyObj('instance', ['signIn'])
      instanceSpy.signIn.and.returnValue(Promise.resolve(updateSpy))
      const auth2Spy = jasmine.createSpyObj('auth2', ['getAuthInstance'])
      auth2Spy.getAuthInstance.and.returnValue(instanceSpy)
      window.gapi = { auth2: auth2Spy }
      user = { email: 'foo@bar.com' }
    })

    it('returns a promise when token is refreshed', (done) => {
      learnjs.googleRefresh(user).then(() => {
        expect(AWS.config.credentials.params.Logins).toEqual({
          'accounts.google.com': 'GOOGLE_ID'
        })
        done()
      })
    })

    it('does not re-prompt for consent when refreshing the token in', (done) => {
      learnjs.googleRefresh(user).then(() => {
        expect(instanceSpy.signIn).toHaveBeenCalledWith({prompt: 'login'})
        done()
      })
    })
  })

  describe('problem view', () => {
    let view, fetchAnswerResolve, fetchAnswerPromise

    beforeEach(() => {
      fetchAnswerPromise = new Promise(resolve => { fetchAnswerResolve = resolve })
      spyOn(learnjs, 'fetchAnswer').and.returnValue(fetchAnswerPromise)
      view = learnjs.problemView('1')
    })

    it('loads the previous answer, if there is one', (done) => {
      fetchAnswerResolve({Item: {answer: 'true'}})
      fetchAnswerPromise.then(() => {
        expect(view.find('.answer').val()).toEqual('true')
        done()
      })
    })

    it('keeps the answer blank until the promise is resolved', () => {
      expect(view.find('.answer').val()).toEqual('')
    })

    it('does nothing if the question has not been answerd yet', (done) => {
      fetchAnswerResolve({})
      fetchAnswerPromise.then(() => {
        expect(view.find('.answer').val()).toEqual('')
        done()
      })
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
        learnjs.dispatchEvent('removingView', {})
        expect($('.nav-list .skip-btn').length).toEqual(0)
      })

      it('contains a link to the next broblem', () => {
        expect($('.nav-list .skip-btn a').attr('href')).toEqual(('#problem-2'))
      })

      it('does not added when at the last problem', () => {
        learnjs.dispatchEvent('removingView', {})
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
          spyOn(learnjs, 'saveAnswer')
          view.find('.answer').val('true')
          view.find('.check-btn').click()
        })

        it('save the result', () => {
          expect(learnjs.saveAnswer).toHaveBeenCalledWith(1, 'true')
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

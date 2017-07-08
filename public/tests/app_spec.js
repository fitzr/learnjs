
describe('LearnJS', () => {
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
    const flash = learnjs.buildCorrectFlash(2)
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
        view = learnjs.problemView('2')
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

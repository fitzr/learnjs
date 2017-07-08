'use strict'

class LearnJS {

  static appOnReady() {
    window.onhashchange = () => {
      LearnJS.showView(window.location.hash)
    }
    LearnJS.showView(window.location.hash)
  }

  static triggerEvent(name, args) {
    $('.view-container>*').trigger(name, args)
  }

  static showView(hash) {
    const routes = {
      '#problem': this.problemView,
      '#': this.landingView,
      '': this.landingView,
    }
    const [view, param] = hash.split('-')
    const viewFn = routes[view]
    if (viewFn) {
      LearnJS.triggerEvent('removingView', [])
      $('.view-container').empty().append(viewFn(param))
    }
  }

  static landingView() {
    return LearnJS.template('landing-view')
  }

  static problemView(data) {
    const problemNumber = parseInt(data, 10)
    const view = LearnJS.template('problem-view')
    const problemData = LearnJS.problems[problemNumber - 1]
    const resultFlash = view.find('.result')

    view.find('.check-btn').click(() => {
      const answer = view.find('.answer').val()
      const test = problemData.code.replace('__', answer) + '; problem();'
      const result = eval(test)

      if (result) {
        const correctFlash = LearnJS.buildCorrectFlash(problemNumber)
        LearnJS.flashElement(resultFlash, correctFlash)
      } else {
        LearnJS.flashElement(resultFlash, 'Incorrect!')
      }

      return false
    })

    if (LearnJS.hasNextProblem(problemNumber)) {
      const buttonItem = LearnJS.template('skip-btn')
      buttonItem.find('a').attr('href', `#problem-${problemNumber + 1}`)
      $('.nav-list').append(buttonItem)
      view.bind('removingView', () => {
        buttonItem.remove()
      })
    }

    view.find('.title').text(`Problem #${problemNumber}`)
    LearnJS.applyObject(problemData, view)
    return view
  }

  static template(name) {
    return $(`.templates .${name}`).clone()
  }

  static buildCorrectFlash(problemNum) {
    const correctFlash = LearnJS.template('correct-flash')
    const link = correctFlash.find('a')
    if (LearnJS.hasNextProblem(problemNum)) {
      link.attr('href', `#problem-${problemNum + 1}`)
    } else {
      link.attr('href', '')
      link.text("You're Finished!")
    }
    return correctFlash
  }

  static flashElement(elem, content) {
    elem.fadeOut('fast', () => {
      elem.html(content)
      elem.fadeIn()
    })
  }

  static applyObject(obj, elem) {
    Object.entries(obj).forEach(([key, val]) => {
      elem.find(`[data-name='${key}']`).text(val)
    })
  }

  static hasNextProblem(number) {
    return number < LearnJS.problems.length
  }
}

LearnJS.problems = [
  {
    description: 'What is truth?',
    code: 'function problem() { return __; }'
  },
  {
    description: 'Simple Math',
    code: 'function problem() { return 42 === 6 * __; }'
  },
]

const learnjs = LearnJS

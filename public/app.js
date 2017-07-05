'use strict'

class LearnJS {

  static appOnReady() {
    window.onhashchange = () => {
      LearnJS.showView(window.location.hash)
    }
    LearnJS.showView(window.location.hash)
  }

  static showView(hash) {
    const routes = {
      '#problem': this.problemView
    }
    const [view, param] = hash.split('-')
    const viewFn = routes[view]
    if (viewFn) {
      $('.view-container').empty().append(viewFn(param))
    }
  }

  static problemView(data) {
    const problemNumber = parseInt(data, 10)
    const view = $('.templates .problem-view').clone()
    const problemData = LearnJS.problems[problemNumber - 1]
    const resultFlash = view.find('.result')

    view.find('.check-btn').click(() => {
      const answer = view.find('.answer').val()
      const test = problemData.code.replace('__', answer) + '; problem();'
      const result = eval(test)
      resultFlash.text(result ? 'Correct!' : 'Incorrect!')
      return false
    })

    view.find('.title').text(`Problem #${problemNumber}`)
    LearnJS.applyObject(problemData, view)
    return view
  }

  static applyObject(obj, elem) {
    Object.entries(obj).forEach(([key, val]) => {
      elem.find(`[data-name='${key}']`).text(val)
    })
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

'use strict'

class LearnJS {
  problemView(problemNumber) {
    const title = `Problem #${problemNumber} Coming soon!`
    return $('<div class="problem-view">').text(title)
  }

  showView(hash) {
    const routes = {
      '#problem': this.problemView
    }
    const [view, param] = hash.split('-')
    const viewFn = routes[view]
    if (viewFn) {
      $('.view-container').empty().append(viewFn(param))
    }
  }
}

const learnjs = new LearnJS()

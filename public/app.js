'use strict'

class LearnJS {
  static problemView(problemNumber) {
    const title = `Problem #${problemNumber} Coming soon!`
    return $('<div class="problem-view">').text(title)
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

  static appOnReady() {
    window.onhashchange = () => {
      LearnJS.showView(window.location.hash)
    }
    LearnJS.showView(window.location.hash)
  }
}

const learnjs = LearnJS

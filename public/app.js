'use strict'

class LearnJS {
  problemView() {
    return $('<div class="problem-view">').text('Coming soon!')
  }

  showView(hash) {
    const routes = {
      '#problem-1': this.problemView
    }
    const viewFn = routes[hash]
    if (viewFn) {
      $('.view-container').empty().append(viewFn)
    }
  }
}

const learnjs = new LearnJS()

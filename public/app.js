'use strict'

class App {
  showView(hash) {
    const problemView = $('<div class="problem-view">').text('Coming soon!')
    $('.view-container').empty().append(problemView)
  }
}

const learnjs = new App()

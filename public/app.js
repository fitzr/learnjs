'use strict'

class LearnJS {

  constructor(problems) {
    this.problems = problems
    this.identity = new Promise(resolve => {
      this.resolve = resolve
    })
    this.email = ''
  }

  setEmail(email) {
    if (this.email !== email) {
      this.email = email
      this.dispatchEvent('changingEmail', email)
    }
  }

  appOnReady() {
    window.onhashchange = () => {
      this.showView(window.location.hash)
    }
    this.showView(window.location.hash)
    this.addProfileLink()
  }

  dispatchEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }))
  }

  addEventListener(name, func) {
    document.addEventListener(name, (e) => func(e.detail))
  }

  showView(hash) {
    const routes = {
      '#problem': this.problemView.bind(this),
      '#profile': this.profileView.bind(this),
      '#': this.landingView.bind(this),
      '': this.landingView.bind(this),
    }
    const [view, param] = hash.split('-')
    const viewFn = routes[view]
    if (viewFn) {
      this.dispatchEvent('removingView', {})
      $('.view-container').empty().append(viewFn(param))
    }
  }

  landingView() {
    return this.template('landing-view')
  }

  problemView(data) {
    const problemNumber = parseInt(data, 10)
    const view = this.template('problem-view')
    const problemData = this.problems[problemNumber - 1]
    const resultFlash = view.find('.result')

    view.find('.check-btn').click(() => {
      const answer = view.find('.answer').val()
      const test = problemData.code.replace('__', answer) + '; problem();'
      const result = eval(test)

      if (result) {
        const correctFlash = this.buildCorrectFlash(problemNumber)
        this.flashElement(resultFlash, correctFlash)
        this.saveAnswer(problemNumber, answer)
      } else {
        this.flashElement(resultFlash, 'Incorrect!')
      }

      return false
    })

    if (this.hasNextProblem(problemNumber)) {
      const buttonItem = this.template('skip-btn')
      buttonItem.find('a').attr('href', `#problem-${problemNumber + 1}`)
      $('.nav-list').append(buttonItem)
      this.addEventListener('removingView', () => { buttonItem.remove() })
    }

    view.find('.title').text(`Problem #${problemNumber}`)
    this.applyObject(problemData, view)
    return view
  }

  profileView() {
    const view = this.template('profile-view')
    view.find('.email').text(this.email)
    return view
  }

  addProfileLink() {
    const link = this.template('profile-link')
    link.find('a').text(this.email)
    $('.signin-bar').prepend(link)
    this.addEventListener('changingEmail', email => {
      link.find('a').text(email)
    })
  }

  template(name) {
    return $(`.templates .${name}`).clone()
  }

  buildCorrectFlash(problemNum) {
    const correctFlash = this.template('correct-flash')
    const link = correctFlash.find('a')
    if (this.hasNextProblem(problemNum)) {
      link.attr('href', `#problem-${problemNum + 1}`)
    } else {
      link.attr('href', '')
      link.text("You're Finished!")
    }
    return correctFlash
  }

  flashElement(elem, content) {
    elem.fadeOut('fast', () => {
      elem.html(content)
      elem.fadeIn()
    })
  }

  applyObject(obj, elem) {
    Object.entries(obj).forEach(([key, val]) => {
      elem.find(`[data-name='${key}']`).text(val)
    })
  }

  hasNextProblem(number) {
    return number < this.problems.length
  }

  googleRefresh() {
    return gapi.auth2
      .getAuthInstance()
      .signIn({ prompt: 'login' })
      .then((userUpdate) => {
        const creds = AWS.config.credentials
        creds.params.Logins['accounts.google.com'] = userUpdate.getAuthResponse().id_token
        return this.awsRefresh().then(id => this.identity = Promise.resolve(id))
      })
  }

  awsRefresh() {
    return AWS.config.credentials.refreshPromise()
      .then(() => AWS.config.credentials.identityId)
  }

  saveAnswer(problemId, answer) {
    return this.identity.then(id => {
      const db = new AWS.DynamoDB.DocumentClient()
      const item = {
        TableName: 'learnjs',
        Item: {
          userId: id,
          problemId: problemId,
          answer,
        }
      }
      learnjs.sendDbRequest(db.put(item), () => this.saveAnswer(problemId, answer))
    })
  }

  sendDbRequest(req, retry) {
    return new Promise((resolve, reject) => {
      req.on('success', (resp) => {
        resolve(resp.data)
      })
      req.on('error', (error) => {
        if (error.code === 'CredentialsError') {
          this.googleRefresh()
              .then(retry)
              .then(resolve)
        } else {
          reject(error)
        }
      })
      req.send()
    })
  }
}

const PROBLEMS = [
  {
    description: 'What is truth?',
    code: 'function problem() { return __; }'
  },
  {
    description: 'Simple Math',
    code: 'function problem() { return 42 === 6 * __; }'
  },
  {
    description: 'Complex Math',
    code: 'function problem() { return __ % 5 === 30; }'
  }
]

const POOL_ID = 'ap-northeast-1:df5562d1-b8ba-4fe0-8ca2-9d25092f192b'

const learnjs = new LearnJS(PROBLEMS)

function googleSignIn(googleUser) {
  const id_token = googleUser.getAuthResponse().id_token

  AWS.config.update({
    region: 'ap-northeast-1',
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: POOL_ID,
      Logins: {
        'accounts.google.com': id_token
      }
    })
  })
  AWS.config.credentials.clearCachedId() // for change account

  learnjs.awsRefresh().then((id) => {
    learnjs.resolve(id)
    const email = googleUser.getBasicProfile().getEmail()
    learnjs.setEmail(email)
  })
}


onmessage = (e) => {
  try {
    postMessage(eval(e.data))
  } catch (e) {
    postMessage(false)
  }
}

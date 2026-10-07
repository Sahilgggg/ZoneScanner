// Runs at most `concurrency` async tasks at once; extra tasks wait in a queue.
export function createLimiter(concurrency) {
  let active = 0
  const queue = []

  function next() {
    if (active >= concurrency || queue.length === 0) return
    active++
    const { task, resolve, reject } = queue.shift()
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        active--
        next()
      })
  }

  return function limit(task) {
    return new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject })
      next()
    })
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

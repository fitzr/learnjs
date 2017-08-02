

describe('lambda function', () => {
  const index = require('../lib/index')
  let context

  beforeEach(() => {
    context = jasmine.createSpyObj('context', ['succeed'])
  })

  describe('echo', () => {
    it('returns a result', () => {
      index.echo({}, context)
      const expected = ["Hello from the cloud! You sent {}"]
      expect(context.succeed).toHaveBeenCalledWith(expected)
    })
  })
})

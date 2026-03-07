describe('Environment Check', () => {
  it('should run on Node 22', () => {
    expect(process.version).toContain('v22');
  });

  it('should have access to JSDOM', () => {
    const div = document.createElement('div');
    expect(div).toBeDefined();
  });
});

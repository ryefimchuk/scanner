require('./bootstrap')().then(() => {
  require('./dist');
}, (e) => {
  console.error(e && e.message);
});

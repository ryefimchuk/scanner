require('./bootstrap')().then(() => {
  require('@3dg/builder-feeder/bin');
}, (e) => {
  console.error(e && e.message);
});

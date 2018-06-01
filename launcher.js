var exec = require('child_process').exec;



function go() {

  var child = exec('node uploader.js')
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)
  child.on('exit', function () {

    setTimeout(function(){
      go();
    }, 1000);
  });
}

go();
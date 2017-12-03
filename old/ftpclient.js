var connected = false;

var ftpClient = require('ftp-client'),
  config = {
    host: '193.107.106.94',
    //host: '193.107.104.237',
    port: 41,
    user: 'admin',
    password: 'S314c241',
  },
  options = {
    logging: 'basic',
  },
  client = new ftpClient(config, options);

client.connect(function() {
  console.log('connected');
  connected = true;

  //uploadFolder('a', 'photo/test');
});

function uploadFolder(source, destFolder) {
  if (connected) {
    /*client.ftp.list('photo/test', false, function(err, list) {
      if (err) {
        console.log('Error:', err);
        return;
      }

      console.log(list);
    });*/

    client.upload(
      ['./' + source + '/**'],
      destFolder,
      {
        //baseDir: 'test',
        overwrite: 'all',
      },
      function(result) {
        console.log(result);
      }
    );
  }
}

module.exports = {
  uploadFolder: uploadFolder,
  getClient: function() {
    return client;
  },
};

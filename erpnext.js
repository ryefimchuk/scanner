const fs = require('fs');
const path = require('path');

module.exports = (destinationFolder, app) => {

  app.use((req, res, next) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
  });

  app.put('/erpnext/tasks/modeling/:taskName/attachTo/:galleryId', (req, res) => {

    const {taskName, galleryId} = req.params;
    const jsonPath = path.resolve(destinationFolder, galleryId, 'example.json');

    try {

      if (!fs.existsSync(jsonPath)) {

        res.sendStatus(500);
        console.log(`Task ${taskName} hasn't been attached because file ${jsonPath} doesn't exist`);
        return;
      }

      fs.writeFileSync(jsonPath, JSON.stringify(
        Object.assign(
          JSON.parse(
            fs.readFileSync(jsonPath)
          ), {taskName}
        ), null, 2
      ));
      res.sendStatus(200);
      console.log(`Task ${taskName} has successfully been attached`);
    } catch (e) {

      res.sendStatus(500);
      console.error(`Failed to attach task ${taskName}`);
    }
  });
};
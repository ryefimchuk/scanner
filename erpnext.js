const fs = require('fs');
const path = require('path');
const request = require('request');
const config = require('./erpnext.config');

function login() {

  return new Promise((resolve, reject) => {

    request.post({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      url: `${config.host}/api/method/login`,
      body: `usr=${config.username}&pwd=${config.password}`
    }, (error, response, body) => {

      if (error || response.statusCode !== 200) {

        if (error) {

          console.error(error.stack);
        }

        reject({error, response, body});
        return;
      }

      resolve(
        response.headers['set-cookie'].join('; ')
      );
    });
  });
}

function call(cookie, method, params) {

  return new Promise((resolve, reject) => {

    request.post({
      headers: {
        'Cookie': cookie
      },
      url: config.host,
      form: Object.assign({}, params, {cmd: method})
    }, (error, response, body) => {

      if (error || response.statusCode !== 200) {

        if (error) {

          console.error(error.stack);
        }

        reject({error, response, body});
        return;
      }

      resolve(
        JSON.parse(body)
      );
    });
  });
}

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

  app.put('/erpnext/tasks/modeling/:taskName/transferringCompleted', (req, res) => {

    const {taskName} = req.params;

    request.put({
      headers: {
        'Authorization': config.authorization,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      url: `${config.host}/api/resource/Modeling Task/${taskName}`,
      form: {
        data: JSON.stringify({
          status: 'Ready For Processing'
        })
      }
    }, (error, response, body) => {

      if (error || response.statusCode !== 200) {

        if (error) {

          console.error(error.stack);
        }

        res
          .status(response.statusCode)
          .send(body);
        return;
      }

      res.sendStatus(200);
    });
  });

  app.put('/erpnext/tasks/modeling/:taskName/processingCompleted', (req, res) => {

    const {taskName} = req.params;

    request.put({
      headers: {
        'Authorization': config.authorization,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      url: `${config.host}/api/resource/Modeling Task/${taskName}`,
      form: {
        data: JSON.stringify({
          status: 'Ready For Modeling',
          workflow_state: 'Ready to Run'
        })
      }
    }, (error, response, body) => {

      if (error || response.statusCode !== 200) {

        if (error) {

          console.error(error.stack);
        }

        res
          .status(response.statusCode)
          .send(body);
        return;
      }

      const modelingTask = JSON.parse(body).data;

      request.get({
        headers: {
          'Authorization': config.authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        url: `${config.host}/api/resource/Sales Order/${modelingTask.sales_order}`
      }, (error, response, body) => {

        if (error || response.statusCode !== 200) {

          if (error) {

            console.error(error.stack);
          }

          res
            .status(response.statusCode)
            .send(body);
          return;
        }

        login().then((cookie) => {

          call(cookie, 'frappe.model.workflow.apply_workflow', {
            doc: JSON.stringify(
              JSON.parse(body).data
            ),
            action: 'Processing Completed'
          }).then(() => {

            res.sendStatus(200);
          }, ({error, response, body}) => {

            res
              .status(response.statusCode)
              .send(body);
          });
        }, ({error, response, body}) => {

          res
            .status(response.statusCode)
            .send(body);
        });
      });
    });
  });
};
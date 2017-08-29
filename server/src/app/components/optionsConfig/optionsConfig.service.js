(function() {
  'use strict';

  angular
    .module('sc2')
    .service('optionsConfig', optionsConfig);

  /** @ngInject */
  function optionsConfig() {

    var options = [
      {
        label: "height",
        command: "height",
        type: "int",
        value: 2464,
        rangeMin:1,
        rangeMax:2464
      },
      {
        label: "width",
        command: "width",
        type: "int",
        value: 3280,
        rangeMin:1,
        rangeMax:3280
      },
      {
        label: "file name",
        command: "output",
        type: "string",
        value: "/home/pi/photo%04d.jpg"
      },
      {
        label: "timeout (in ms)[0 = off]",
        command: "timeout",
        type: "int",
        value: 500,
        rangeMin:0,
        rangeMax:5000
      },
      {
        label: "timelaps (in ms)",
        command: "timelaps",
        type: "int",
        value: "",
        rangeMin:300,
        rangeMax:5000
      },

      {
        label: "sharpness (-100 to 100)",
        command: "sharpness",
        type: "int",
        value: "",
        rangeMin:-100,
        rangeMax:100
      },
      {
        label: "contrast (-100 to 100)",
        command: "contrast",
        type: "int",
        value: "",
        rangeMin:-100,
        rangeMax:100
      },
      {
        label: "brightness (0 to 100)",
        command: "brightness",
        type: "int",
        value: "",
        rangeMin:0,
        rangeMax:100
      },
      {
        label: "ISO",
        command: "ISO",
        type: "list",
        list:[
          "0",
          "100",
          "160",
          "200",
          "250",
          "320",
          "400",
          "500",
          "640",
          "800"
        ]
      },
      {
        label: "Exposure",
        command: "exposure",
        type: "list",
        list: [
          "off",
          "auto",
          "night",
          "nightpreview",
          "backlight",
          "spotlight",
          "sports",
          "snow",
          "beach",
          "verylong",
          "fixedfps",
          "antishake",
          "fireworks"
        ]
      },
      {
        label: "AWB",
        command: "awb",
        type: "list",
        list: [
          "off",
          "auto",
          "sun",
          "cloud",
          "shade",
          "tungsten",
          "fluorescent",
          "incandescent",
          "flash",
          "horison"
        ]
      },
      {
        label: "Image Effect",
        command: "imxfx",
        type: "list",
        list: [
          "none",
          "negative",
          "solarise",
          "sketch",
          "denoise",
          "emboss",
          "oilpaint",
          "hatch",
          "gpen",
          "pastel",
          "watercolour",
          "film",
          "blur",
          "saturation",
          "colourswap",
          "washedout",
          "posterise",
          "colourpoint",
          "colourbalance",
          "cartoon"
        ]
      },
      {
        label: "Metering",
        command: "metering",
        type: "list",
        list: [
          "average",
          "spot",
          "backlit",
          "matrix"
        ]
      },
      {
        label: "DRC",
        command: "drc",
        type: "list",
        list: [
          "off",
          "low",
          "med",
          "high"
        ]
      }
    ];


    function getOptions() {
      return options;
    }

    this.getOptions = getOptions;
  }

})();

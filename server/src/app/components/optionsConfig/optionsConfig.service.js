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
        command: "-h",
        type: "int",
        value: 1024,
        rangeMin:1,
        rangeMax:2240
      },
      {
        label: "width",
        command: "-w",
        type: "int",
        value: 1920,
        rangeMin:1,
        rangeMax:3200
      },
      {
        label: "file name",
        command: "-o",
        type: "string",
        value: "photo%04d.jpg"
      },
      {
        label: "timeout (in ms)[0 = off]",
        command: "-t",
        type: "int",
        value: 500,
        rangeMin:0,
        rangeMax:5000
      },
      {
        label: "timelaps (in ms)",
        command: "-tl",
        type: "int",
        value: "",
        rangeMin:300,
        rangeMax:5000
      },

      {
        label: "sharpness (-100 to 100)",
        command: "-sh",
        type: "int",
        value: "",
        rangeMin:-100,
        rangeMax:100
      },
      {
        label: "contrast (-100 to 100)",
        command: "-co",
        type: "int",
        value: "",
        rangeMin:-100,
        rangeMax:100
      },
      {
        label: "brightness (0 to 100)",
        command: "-br",
        type: "int",
        value: "",
        rangeMin:0,
        rangeMax:100
      },
      {
        label: "ISO",
        command: "-iso",
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
        command: "-ex",
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
        command: "-awb",
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
        command: "-ifx",
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
        label: "Matering",
        command: "-mm",
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
        command: "-drc",
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

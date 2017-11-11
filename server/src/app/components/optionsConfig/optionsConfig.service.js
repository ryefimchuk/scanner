(function() {
  'use strict';

  angular
    .module('sc2')
    .service('optionsConfig', optionsConfig);

  /** @ngInject */
  function optionsConfig(exSocket) {

    var data = {
      options: [
        {
          label: "height",
          command: "height",
          type: "int",
          value: 2464,
          rangeMin: 1,
          rangeMax: 2464
        },
        {
          label: "width",
          command: "width",
          type: "int",
          value: 3280,
          rangeMin: 1,
          rangeMax: 3280
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
          rangeMin: 0,
          rangeMax: 5000
        },
        {
          label: "timelapse (in ms)",
          command: "timelapse",
          type: "int",
          value: "",
          rangeMin: 300,
          rangeMax: 5000
        },
        {
          label: "Skip frame (0 to 5)",
          command: "skip",
          type: "int",
          value: "",
          rangeMin: 0,
          rangeMax: 5
        },
        {
          label: "sharpness (-100 to 100)",
          command: "sharpness",
          type: "int",
          value: "",
          rangeMin: -100,
          rangeMax: 100
        },
        {
          label: "contrast (-100 to 100)",
          command: "contrast",
          type: "int",
          value: "",
          rangeMin: -100,
          rangeMax: 100
        },
        {
          label: "brightness (0 to 100)",
          command: "brightness",
          type: "int",
          value: "",
          rangeMin: 0,
          rangeMax: 100
        },
        {
          label: "Saturation (-100 to 100)",
          command: "saturation",
          type: "int",
          value: "",
          rangeMin: -100,
          rangeMax: 100
        },
        {
          label: "ISO",
          command: "ISO",
          type: "list",
          list: [
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
          label: "Shutter (μs) (0 to 10000)",
          command: "ss",
          type: "int",
          value: "",
          rangeMin: 0,
          rangeMax: 10000
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
      ],
      lightSettings: {
        lightStart: 0,
        lightFinish: 500,
        projectorStart: 500,
        projectorFinish: 500
      },
      presets: [],
      selectedPreset: '',
      photoSettings: null
    };

    var _photo = null;
    var _light = null;

    exSocket.on('current settings', function (_data) {
      try
      {
        data.selectedPreset = _data.selectedPreset;
        data.presets = _data.presets;
        if(_data.lightSettings) {
          data.lightSettings = _data.lightSettings;
        }
        if(_data.photoSettings) {
          data.photoSettings = _data.photoSettings;
        }

        for(var i = 0; i < data.options.length; i++){
          var cmd = data.options[i].command;
          data.options[i].value = data.photoSettings[cmd];
        }
      }
      catch(e){}
    });

    function getOptions() {
      return data;
    }

    this.getOptions = getOptions;
  }

})();

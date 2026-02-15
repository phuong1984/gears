var world_Missions = new function() {
  World_Base.call(this);
  this.parent = {};
  for (p in this) {
    this.parent[p] = this[p];
  }

  var self = this;

  this.name = 'missions';
  this.shortDescription = 'Missions (FLL, WRO, etc)';
  this.longDescription =
    '<p>This world contains various missions.</p>' +
    '<p>Currently, we only have missions based on First Lego League (FLL) and World Robot Olympiad (WRO), but we welcome contributions of any types of missions.</p>' +
    '<p>Contributed missions should be constructed using json only (ie. no javascript) to be suitable for inclusion here.</p>';
  this.thumbnail = 'images/worlds/missions.jpg';

  this.optionsConfigurations = [
    {
      option: 'jsonFile',
      title: 'Select Mission',
      type: 'select',
      options: [
        ['2026 WRO (Elementary)', 'worlds/missions/WRO/WRO-2026-Elementary.json?v=4c73f1f0'],
        ['2026 WRO (Junior)', 'worlds/missions/WRO/WRO-2026-Junior.json?v=0b927780'],
        ['2026 WRO (Senior)', 'worlds/missions/WRO/WRO-2026-Senior.json?v=4665f124'],
        ['2025 FLL (Unearthed)', 'worlds/missions/FLL/FLL2025.json?v=bb7a99b0'],
        ['2025 WRO (Sport)', 'worlds/missions/WRO/WRO-2025-Sport.json?v=403712ac'],
        ['2025 WRO (Future Engineer Simple)', 'worlds/missions/WRO/WRO-2025-Future-Engineer-Simple.json?v=cb94da0f'],
        ['2025 WRO (Future Engineer Open)', 'worlds/missions/WRO/WRO-2025-Future-Engineer-Open.json?v=3ab57bca'],
        ['2025 WRO (Future Engineer Obstacle)', 'worlds/missions/WRO/WRO-2025-Future-Engineer-Obstacle.json?v=390cdab4'],
        ['2025 WRO (Elementary)', 'worlds/missions/WRO/WRO-2025-Elementary.json?v=02379792'],
        ['2025 WRO (Junior)', 'worlds/missions/WRO/WRO-2025-Junior.json?v=4f470036'],
        ['2025 WRO (Senior)', 'worlds/missions/WRO/WRO-2025-Senior.json?v=ff83c210'],
        ['2024 FLL (Submerged)', 'worlds/missions/FLL/FLL2024.json?v=99063c4d'],
        ['2024 WRO (Elementary)', 'worlds/missions/WRO/WRO-2024-Elementary.json?v=545c90ed'],
        ['2024 WRO (Junior)', 'worlds/missions/WRO/WRO-2024-Junior.json?v=60ee1b70'],
        ['2024 WRO (Senior)', 'worlds/missions/WRO/WRO-2024-Senior.json?v=ed245ace'],
        ['2023 FLL (Masterpiece)', 'worlds/missions/FLL/FLL2023.json?v=00d83129'],
        ['2023 WRO (Elementary)', 'worlds/missions/WRO/WRO-2023-Elementary.json?v=44284070'],
        ['2023 WRO (Junior)', 'worlds/missions/WRO/WRO-2023-Junior.json?v=481819af'],
        ['2023 WRO (Senior) No Models', 'worlds/missions/WRO/WRO-2023-Senior.json?v=11f317fd'],
        ['2022 FLL (Superpowered)', 'worlds/missions/FLL/FLL2022.json?v=fabb88bf'],
        ['2022 WRO (Elementary)', 'worlds/missions/WRO/WRO-2022-Regular-Elementary-1.json?v=d0be8f47'],
        ['2022 WRO (Elementary) Randomization 2', 'worlds/missions/WRO/WRO-2022-Regular-Elementary-2.json?v=6d12d057'],
        ['2022 WRO (Junior)', 'worlds/missions/WRO/WRO-2022-Regular-Junior.json?v=97c3739f'],
        ['2022 WRO (Senior)', 'worlds/missions/WRO/WRO-2022-Regular-Senior.json?v=e7f9d56b'],
        ['2021 FLL (Cargo Connect)', 'worlds/missions/FLL/FLL2021.json?v=bbf20407'],
        ['2021 WRO (Elementary)', 'worlds/missions/WRO/WRO-2021-Regular-Elementary.json?v=d3a2561a'],
        ['2021 WRO (Junior)', 'worlds/missions/WRO/WRO-2021-Regular-Junior.json?v=490c6bc0'],
        ['2021 WRO (Senior)', 'worlds/missions/WRO/WRO-2021-Regular-Senior.json?v=ca0e7979'],
        ['2020 FLL (RePLAY v2)', 'worlds/missions/FLL/FLL2020v2.json?v=a6f7ee20'],
        ['2020 FLL (RePLAY)', 'worlds/missions/FLL/FLL2020.json?v=eec3cb0b'],
        ['2020 WRO (Elementary)', 'worlds/missions/WRO/WRO-2020-Regular-Elementary.json?v=4199873d'],
        ['2020 WRO (Junior)', 'worlds/missions/WRO/WRO-2020-Regular-Junior.json?v=e322c744'],
        ['2019 FLL (City Shaper)', 'worlds/missions/FLL/FLL2019.json?v=caa17ac3'],
        ['2019 WRO (Elementary)', 'worlds/missions/WRO/WRO-2019-Regular-Elementary.json?v=6e869a06'],
        ['2019 WRO (Junior)', 'worlds/missions/WRO/WRO-2019-Regular-Junior.json?v=7781d666'],
        ['2018 FLL (Into Orbit)', 'worlds/missions/FLL/FLL2018.json?v=539a8b67'],
        ['2018 WRO (Elementary)', 'worlds/missions/WRO/WRO-2018-Regular-Elementary.json?v=5d5a8c98'],
        ['2018 WRO (Junior)', 'worlds/missions/WRO/WRO-2018-Regular-Junior.json?v=bb8e875a'],
      ]
    },
    {
      option: 'wall',
      title: 'Wall',
      type: 'checkbox',
      label: 'Wall Present'
    },
    {
      option: 'showTimer',
      title: 'Timer',
      type: 'checkbox',
      label: 'Show Timer'
    },
    {
      option: 'missions',
      title: 'Missions',
      type: 'checkbox',
      label: 'Mission Objects Present',
      help: 'Mission objects are only available for some missions.'
    },
    {
      option: 'wallHeight',
      title: 'Wall Height (cm)',
      type: 'slider',
      min: '0',
      max: '30',
      step: '0.1'
    },
    {
      option: 'wallThickness',
      title: 'Wall Thickness (cm)',
      type: 'slider',
      min: '0',
      max: '30',
      step: '0.1'
    },
    {
      option: 'startPos',
      title: 'Starting Position',
      type: 'select',
      options: [
        ['Mission Default', 'missionDefault'],
        ['Center', 'center'],
        ['Bottom Left', 'bottomLeft'],
        ['Bottom Center', 'bottomCenter'],
        ['Bottom Right', 'bottomRight'],
        ['Player 0', 'P0'],
        ['Player 1', 'P1'],
        ['Player 2', 'P2'],
        ['Player 3', 'P3'],
      ]
    },
    {
      option: 'startPosXYZStr',
      title: 'Starting Position (x, y)',
      type: 'text',
      help: 'Enter using this format "x, y" (in cm, without quotes) and it will override the above. Center of image is "0, 0".'
    },
    {
      option: 'startRotStr',
      title: 'Starting Rotation (degrees)',
      type: 'text',
      help: 'Set the starting rotation in degrees. Positive rotation is clockwise.'
    }
  ];

  this.defaultOptions = Object.assign(this.defaultOptions, {
    jsonFile: this.optionsConfigurations[0].options[0][1],
    showTimer: true,
    missions: true,
    wallHeight: 7.7,
    wallThickness: 4.5,
    startPos: 'missionDefault',
  });

  // Set options, including default
  this.setOptions = function(options) {
    return fetch(options.jsonFile)
      .then(response => response.json())
      .then(function(data){
        self.options = {...self.defaultOptions};
        Object.assign(self.options, data.options);
        Object.assign(self.options, options);

        if (options.showTimer != true) {
          self.options.timer = 'none';
        }
        if (options.missions != true) {
          self.options.objects = {};
        }
        if (options.startPos != 'missionDefault') {
          self.options.startPosXYZ = null;
          self.options.startRot = null;
        }

        return self.parent.setOptions();
      });
  };

  // Run on page load
  this.init = function() {
    Object.assign(self.options, self.defaultOptions);
  };
}

// Init class
world_Missions.init();

if (typeof worlds == 'undefined') {
  var worlds = [];
}
worlds.push(world_Missions);
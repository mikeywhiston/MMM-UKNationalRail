/* Magic Mirror
 * Module: UK National Rail
 *
 * Originally by Nick Wootton
 * Migrated to OpenLDBWS by Matt Dyson
 *
 * https://github.com/mattdy/MMM-UKNationalRail
 *
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const Log = require("../../js/logger");
const request = require("sync-request");

module.exports = NodeHelper.create({
  start: function () {
    Log.info("MMM-UKNationalRail helper started");

    this.started = false;
    this.config = {};
    this.rail = null;
  },

  getTimetable: function (id) {
    var self = this;

    var options = {};

    options.rows = this.config[id].fetchRows;

    if (this.config[id].filterDestination) {
      options.destination = this.config[id].filterDestination;
    }

    Log.info("Sending request for departure board information");
    // this.rail.getDepartureBoardWithDetails(
    //   this.config[id].station,
    //   options,
    //   function (error, result) {
    //     Log.info("Return from getDepartureBoard: " + error + " - " + result);
    //     const newResult = { result, id };

    //     if (!error) {
    //       self.sendSocketNotification("UKNR_DATA", newResult);
    //     }
    //   }
    // );

    const crs = this.config[id].station;
    const res = request(
      "GET", 
      `${this.config[id].base_url}/${crs}`,
      {
        headers: {
          "Accept": "application/json",
          "x-apikey": `${this.config[id].token}` // conforming to RDM standard
        }
      }
    );

    if (res.statusCode === 200) {
      Log.info("Return from GetDepBoardWithDetails");
      const result = JSON.parse(res.getBody('utf8'));
      const newResult = { result, id };

      self.sendSocketNotification("UKNR_DATA", newResult);
    }
        
  },

  socketNotificationReceived: function (notification, payload) {
    Log.info("socketNotificationReceived");
    switch (notification) {
      case "UKNR_TRAININFO":
        this.getTimetable(payload.id);
        break;

      case "UKNR_CONFIG":
        Log.info("MMM-UKNationalRail received configuration");
        this.config[payload.id] = payload.config;

        var config = this.config[payload.id];

        // if the filter destination is not defined ignore
        if (config.filterDestination.length === 1) {
          // if there is only one filter destination keep it
          config.filterDestination = config.filterDestination[0];
        } else {
          // otherwise remove it and handle the multiple filter destinations on the response
          delete config.filterDestination;
        }

        this.rail = new Rail(this.config[payload.id].token);

        this.sendSocketNotification("UKNR_STARTED", true);
        this.getTimetable(payload.id);
        this.started = true;
    }
  }
});

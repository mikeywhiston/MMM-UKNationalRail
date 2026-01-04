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
const axios = require("axios");


module.exports = NodeHelper.create({
	start: function () {
		Log.info("MMM-UKNationalRail helper started");

		this.started = false;
		this.config = {};
	},

	getTimetable: async function (id) {
		var self = this;

		var options = {};

		options.rows = this.config[id].fetchRows;

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
		const url = `https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120/GetDepBoardWithDetails/${crs}`;

		try {
			const res = await axios.get(url, {
				headers: {
					"Accept": "application/json",
					"x-apikey": this.config[id].token
				}
			});

			if (res.status === 200) {
				Log.info("Return from GetDepBoardWithDetails");
				const result = res.data;
				const newResult = { result, id };

				self.sendSocketNotification("UKNR_DATA", newResult);
			} else {
				Log.error(this.name, "Unexpected status code:", res.status);
				Log.error(this.name, "Response data:", res.data);
			}
		} catch (error) {
			if (error.response) {
				// HTTP error response from API
				Log.error(
					this.name,
					"API returned error:",
					error.response.status,
					error.response.data
				);
			} else {
				// Network / other error
				Log.error(this.name, "Axios request failed:", error.message);
			}
		}
	},

	socketNotificationReceived: async function (notification, payload) {
		Log.info("socketNotificationReceived");
		switch (notification) {
			case "UKNR_TRAININFO":
				await this.getTimetable(payload.id);
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


				this.sendSocketNotification("UKNR_STARTED", true);
				this.getTimetable(payload.id);
				this.started = true;
		}
	}
});

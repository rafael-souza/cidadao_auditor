(function(){
    var cordovaRef = window.PhoneGap || window.cordova || window.Cordova;
	
	function Sim() { }

	Sim.prototype.getSimInfo = function (successCallback, errorCallback) {
		return cordovaRef.exec(successCallback, errorCallback, 'Sim', 'getSimInfo', []);
	};
  
	Sim.prototype.getAirplaneModeStatus = function (successCallback, errorCallback) {
		return cordovaRef.exec(successCallback, errorCallback, 'Sim', 'getAirplaneModeStatus', []);
	};
	
	Sim.prototype.getServiceState = function (successCallback, errorCallback) {
		return cordovaRef.exec(successCallback, errorCallback, 'Sim', 'getServiceState', []);
	};
	
	Sim.prototype.initServiceStateListener = function (successCallback, errorCallback) {
		return cordovaRef.exec(successCallback, errorCallback, 'Sim', 'initServiceStateListener', []);
	};
	
	if (cordovaRef && cordovaRef.addConstructor) {
        cordovaRef.addConstructor(init);
    }
    else {
        init();
    }

	function init(){
		if (!window.plugins) {
			window.plugins = {};
	    }

		if (!window.plugins.sim){
			window.plugins.sim = new Sim();
		}
	}
	
	if (typeof module != 'undefined' && module.exports) {
        module.exports = new Sim();
    }
	
})();
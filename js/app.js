var app = angular.module('weatherApp', []);

app.controller('weatherCtrl', ['$scope', '$http', function($scope, $http) {

	// current location
    $scope.loc = { lat: 40.7127837, lon: -74.0059413 };
    $scope.gotoCurrentLocation = function () {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var c = position.coords;
                $scope.gotoLocation(c.latitude, c.longitude);
            });
            return true;
        }
        return false;
    };
    $scope.gotoLocation = function (lat, lon) {
        if ($scope.lat != lat || $scope.lon != lon) {
            $scope.loc = { lat: lat, lon: lon };
            if (!$scope.$$phase) $scope.$apply("loc");
        }
    };

    // geo-coding
    $scope.search = "New York, NY, USA";
    $scope.geoCode = function () {
        if ($scope.search && $scope.search.length > 0) {
            if (!this.geocoder) this.geocoder = new google.maps.Geocoder();
            this.geocoder.geocode({ 'address': $scope.search }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var loc = results[0].geometry.location;
                    $scope.search = results[0].formatted_address;
                    $scope.gotoLocation(loc.lat(), loc.lng());
                    $scope.findWeather(loc.lat(), loc.lng());
                } else {
                    alert("Sorry, this search produced no results.");
                }
            });
        }
    };

    // find current weather
    $scope.findWeather = function (lat, lon) {
        
        var url = 'https://api.forecast.io/forecast/07bb8b7f6f8767a188e5d47ac551ef42' + '/' + lat + ',' + lon + '?callback=JSON_CALLBACK';
        
        $http.jsonp(url)
        .success(function(data){
            $scope.currentTemp = data.currently.temperature;
            $scope.precipProb = data.currently.precipProbability;
            $scope.windSpeed = data.currently.windSpeed;
            $scope.dateTime = data.currently.time;
            $scope.today = new Date();
            console.log(data);
        });
        
    };

    $scope.convertToDate = function (dateTime){

        return new Date(dateTime * 1000);

    };
    
    $scope.geoCode();

}]);

// formats a number as a latitude (e.g. 40.46... => "40°27'44"N")
app.filter('lat', function () {
    return function (input, decimals) {
        if (!decimals) decimals = 0;
        input = input * 1;
        var ns = input > 0 ? "N" : "S";
        input = Math.abs(input);
	    var deg = Math.floor(input);
        var min = Math.floor((input - deg) * 60);
	    var sec = ((input - deg - min / 60) * 3600).toFixed(decimals);
        return deg + "°" + min + "'" + sec + '"' + ns;
    }
});

// formats a number as a longitude (e.g. -80.02... => "80°1'24"W")
app.filter('lon', function () {
    return function (input, decimals) {
        if (!decimals) decimals = 0;
        input = input * 1;
        var ew = input > 0 ? "E" : "W";
        input = Math.abs(input);
        var deg = Math.floor(input);
        var min = Math.floor((input - deg) * 60);
        var sec = ((input - deg - min / 60) * 3600).toFixed(decimals);
        return deg + "°" + min + "'" + sec + '"' + ew;
    }
});



                
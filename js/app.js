var app = angular.module('weatherApp', ['firebase']);


app.controller('weatherCtrl', ['$scope', '$http', 'Auth','$firebaseArray', 
  function($scope, $http, Auth, $firebaseArray) {

    $scope.auth = Auth;

    $scope.auth.$onAuth(function(authData){
        $scope.authData = authData;
    });

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
                } else {
                    alert("Sorry, this search produced no results.");
                }
            });
        }
    };

    // find current weather using forecast.io api
    $scope.findWeather = function () {

        $scope.geoCode();
        
        var url = 'https://api.forecast.io/forecast/07bb8b7f6f8767a188e5d47ac551ef42' + '/' + $scope.loc.lat + ',' + $scope.loc.lon + '?callback=JSON_CALLBACK';
        
        $http.jsonp(url)
        .success(function(data){
            $scope.currentTemp = data.currently.temperature;
            $scope.precipProb = data.currently.precipProbability;
            $scope.windSpeed = data.currently.windSpeed;
            $scope.dateTime = data.currently.time;
            $scope.icon = data.currently.icon;
            $scope.today = new Date();
            $scope.summary = data.currently.summary;
            $scope.weekReport = data.daily.data;
            //console.log(data);
            $scope.addToSearchHistory();
        }).error(function(status){
            console.log(status);
        });
        
    };

    // find historic or futuristic weather using forecast.io api
    $scope.findDetailedWeather= function (date) {

        $scope.geoCode();
        
        var url = 'https://api.forecast.io/forecast/07bb8b7f6f8767a188e5d47ac551ef42' + '/' + $scope.loc.lat + ',' + $scope.loc.lon + ',' + date + '?callback=JSON_CALLBACK';
        
        $http.jsonp(url)
        .success(function(data){
            $scope.hoursReport = data.hourly.data;
            console.log(data);
            $scope.addToSearchHistory();
            $scope.dataGroup = d3.nest().key(function(d){
                return d.time;
            }).entries($scope.hoursReport);
            $scope.InitChart();
        }).error(function(status){
            console.log(status);
        });
        
    };

    // clear the d3 chart, but having issue remaking the chart
    $scope.clearChart = function () {

        d3.selectAll('svg').remove();
        $scope.hoursReport = null;

    };

    $scope.InitChart = function () {
         
        // reformat key   
        $scope.dataGroup.forEach(function (d) { 
            d.key = new Date(d.key * 1000); 
        });

        //console.log($scope.dataGroup); 

        var margin = {"top": 20, "right": 20, "bottom": 20, "left": 30, "axis": 20};
        var width = 805 + margin.right + margin.left;
        var height = 500 + margin.top + margin.bottom;
        var timeFormat = d3.time.format("%I:%M %p");

        // set up chart
        var svg = d3.select("#visualisation").attr("width", width).attr("height", height);
        var chart = d3.select("svg");

        // find data range
        var xMin = d3.min($scope.dataGroup, function(d) { return Math.min(d.key); });
        var xMax = d3.max($scope.dataGroup, function(d) { return Math.max(d.key); });

        var yMin = 0;
        var yMax = 100;

        // debugging purpose
        /*
        console.log("yMin" + " " + yMin);
        console.log("yMax" + " " + yMax);

        console.log("xMin" + " " + xMin);
        console.log("xMax" + " " + xMax);
        */

        // scale using ranges
        var xScale = d3.time.scale()
            .domain([xMin, xMax])
            .range([margin.left, width - margin.right]);

        var xAxisScale = d3.time.scale()
           .domain([xMin, xMax])
           .range([margin.left, width - margin.axis]);

        var yScale = d3.scale.linear()
            .domain([yMin, yMax])
            .range([height - margin.top, margin.bottom]);

        // set up axes
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            .ticks(20);
              
        var xAxis = d3.svg.axis()
            .scale(xAxisScale)
            .orient("bottom")
            .ticks(5)
            .tickFormat(timeFormat);

        var valueLine = d3.svg.line()
            .x(function(d) { return xScale(d.key); })
            .y(function(d) { return yScale(d.values[0].temperature); })
            .interpolate("cardinal");

        // create line
        chart.append("path")
            .attr("class", "line")
            .attr("stroke-width", 2)
            .attr('fill', 'none')
            .attr('stroke', 'blue')
            .attr("d", valueLine($scope.dataGroup));
            
        // create scatter plot
        chart.selectAll("circle")
            .data($scope.dataGroup)
            .enter()
            .append("circle")
            .attr("cx", function (d) {
                return xScale(d.key);
            })
            .attr("cy", function (d) {
                return yScale(d.values[0].temperature);
            })
            .attr("r", 5)
            .attr("fill", "#0B9BD7");

        // append axis
        chart.append('g').call(xAxis)
            .attr('transform', 'translate(0, ' + (height - margin.bottom) + ')')
            .attr('class', 'axis');

        chart.append('g').call(yAxis)
            .attr('transform', "translate(" + (margin.left) + ",0)")
            .attr('class', 'axis');
        }

    // time capsule feature
    $scope.timeCapsule = function () {

        $scope.findDetailedWeather(Date.parse($scope.capsuleDate)/1000);
    }

    // format data into readable date & time
    $scope.convertToDate = function (dateTime){

        return new Date(dateTime * 1000);

    };
    
    // add search query to user history
    $scope.addToSearchHistory = function (){
        if($scope.authData){
            var userID = $scope.authData.uid;

            var ref = new Firebase("https://vivid-inferno-197.firebaseio.com/users/"+userID);
            var list = $firebaseArray(ref);

            list.$add({ 
                search : $scope.search,
                date   : new Date()
            }).then(function(){
                var query = ref.orderByKey().limitToLast(20);

                $scope.searchList = $firebaseArray(query);
                console.log($scope.searchList);
            });
        }
    };

    // shows user's search history
    $scope.showSearchHistory = function (){
        if($scope.authData){

            $scope.searchLimit = parseInt($scope.searchLimit, 10);

            var userID = $scope.authData.uid;
            var ref = new Firebase("https://vivid-inferno-197.firebaseio.com/users/"+userID);
            
            var query = ref.orderByKey().limitToLast($scope.searchLimit);

            $scope.searchList = $firebaseArray(query);

            console.log($scope.searchList);
        }
    };

}]);

app.factory('Auth', ['$firebaseAuth', function($firebaseAuth){
    var myFirebaseRef = new Firebase("https://vivid-inferno-197.firebaseio.com/");
    return $firebaseAuth(myFirebaseRef);
}]);

// controller for user related activity (login/signup/logout)
app.controller('userCtrl', ['$scope', 'Auth', function($scope, Auth){

    $scope.auth = Auth;

    $scope.createUser = function(){
        $scope.message = null;
        $scope.error = null;

        Auth.$createUser({
            email    : $scope.userEmail,
            password : $scope.userPw
        }).then(function(userData){
            $scope.message = "Created user with Id: " + $scope.userEmail;
        }).catch(function(error){
            $scope.error = error;
        });
    };

    $scope.login = function(){
        $scope.message = null;
        $scope.authData = null;
        $scope.error = null;

        Auth.$authWithPassword({
            email    : $scope.userEmail,
            password : $scope.userPw
        }).then(function(authData) {
            $scope.message = "You're now logged in as " + authData.password.email;
            $scope.authData = authData;
        }).catch(function(error) {
            switch (error.code) {
                    case "INVALID_EMAIL":
                        $scope.error = "The specified user account email is invalid.";
                        break;
                    case "INVALID_PASSWORD":
                        $scope.error = "The specified user account password is incorrect.";
                        break;
                    case "INVALID_USER":
                        $scope.error = "The specified user account does not exist.";
                        break;
                    default:
                        $scope.error = "Error logging user in:", error;
            }
            console.log("Authentication failed:", error);
        })
    };

    $scope.auth.$onAuth(function(authData){
        $scope.authData = authData;
    });

}]);


// reverse the order of firebasearray but creates errors on console
app.filter('reverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
  });

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



                
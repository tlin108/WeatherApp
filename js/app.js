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
                    $scope.findWeather(loc.lat(), loc.lng());
                    $scope.addToSearchHistory();
                } else {
                    alert("Sorry, this search produced no results.");
                }
            });
        }
    };

    // find current weather using forecast.io api
    $scope.findWeather = function (lat, lon) {
        
        var url = 'https://api.forecast.io/forecast/07bb8b7f6f8767a188e5d47ac551ef42' + '/' + lat + ',' + lon + '?callback=JSON_CALLBACK';
        
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
            console.log(data);
        }).error(function(status){
            console.log(status);
        });
        
    };

    $scope.timeCapsule = function () {
        console.log($scope.search);
        console.log(Date.parse($scope.capsuleDate));

        function InitChart() {
                    var data = [{
                        "sale": "202",
                        "year": "2000"
                    }, {
                        "sale": "215",
                        "year": "2002"
                    }, {
                        "sale": "179",
                        "year": "2004"
                    }, {
                        "sale": "199",
                        "year": "2006"
                    }, {
                        "sale": "134",
                        "year": "2008"
                    }, {
                        "sale": "176",
                        "year": "2010"
                    }];
                    var data2 = [{
                        "sale": "152",
                        "year": "2000"
                    }, {
                        "sale": "189",
                        "year": "2002"
                    }, {
                        "sale": "179",
                        "year": "2004"
                    }, {
                        "sale": "199",
                        "year": "2006"
                    }, {
                        "sale": "134",
                        "year": "2008"
                    }, {
                        "sale": "176",
                        "year": "2010"
                    }];
                    var vis = d3.select("#visualisation"),
                        WIDTH = 1000,
                        HEIGHT = 500,
                        MARGINS = {
                            top: 20,
                            right: 20,
                            bottom: 20,
                            left: 50
                        },
                        xScale = d3.scale.linear().range([MARGINS.left, WIDTH - MARGINS.right]).domain([2000, 2010]),
                        yScale = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([134, 215]),
                        xAxis = d3.svg.axis()
                        .scale(xScale),
                        yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left");
                    
                    vis.append("svg:g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
                        .call(xAxis);
                    vis.append("svg:g")
                        .attr("class", "y axis")
                        .attr("transform", "translate(" + (MARGINS.left) + ",0)")
                        .call(yAxis);
                    var lineGen = d3.svg.line()
                        .x(function(d) {
                            return xScale(d.year);
                        })
                        .y(function(d) {
                            return yScale(d.sale);
                        })
                        .interpolate("basis");
                    vis.append('svg:path')
                        .attr('d', lineGen(data))
                        .attr('stroke', 'green')
                        .attr('stroke-width', 2)
                        .attr('fill', 'none');
                    vis.append('svg:path')
                        .attr('d', lineGen(data2))
                        .attr('stroke', 'blue')
                        .attr('stroke-width', 2)
                        .attr('fill', 'none');
        }
        InitChart();
    }

    // format data into readable date & time
    $scope.convertToDate = function (dateTime){

        return new Date(dateTime * 1000);

    };
    

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



                
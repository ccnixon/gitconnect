angular.module('myApp.connect', ['ngRoute', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/connect', {
  	authenticate: true,
    templateUrl: 'view/connect/connect.html',
    controller: 'connectCtrl',
    resolve: {
      //The view will not load until this promise is resolved.
      matches: ['User', function(User) {
        return User.getMatches();
      }],
      getProfile: ['$route', 'User', 'Cookie', '$cookies', function($route, User, Cookie, $cookies) {
        var cookie = $cookies.get('gitConnectDeltaKS');
        var cookieObj = Cookie.parseCookie(cookie);
        // return User.getProfile(cookieObj.username);
        return User.getProfileAndRelations(cookieObj.username);

      }]

    }
  });
}])

.directive('onFinishRender', ['$timeout', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit('ngRepeatFinished');
                });
            }
        }
    }
}])

.controller('connectCtrl', ['$scope', 'matches', 'getProfile', '$http', 'availabilityToggle', '$window', 'Cookie', '$cookies', 'socket', 'techList', '$rootScope', '$timeout', function($scope, matches, getProfile, $http, availabilityToggle, $window, Cookie, $cookies, socket, techList, $rootScope, $timeout) {

  // get user information, disable if availability is false
  $scope.user = getProfile;

  $scope.defaultUsers = matches;

  $scope.users = matches;
  
  $scope.selections = [];

  // Set default user address to the form
  if ($scope.user.relationships.Lives) {
    $('#city-input').val($scope.user.relationships.Lives[0].city)
  }

  // Check availability status on page render
  $scope.statusCheck = function() {
    $scope.availability = JSON.parse($scope.user.user.availability);
  }

  $scope.techList = [];
  var techs = techList.getTechList();
  techs.forEach(function(element) {
    $scope.techList.push(element);
  })

  $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
      $scope.swiper = new Swiper('.swiper-container', {
        effect: 'coverflow',
        grabCursor: true,
        noSwiping: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        coverflow: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows : true
        },
        // Navigation arrows
        nextButton: '.swiper-button-next',
        prevButton: '.swiper-button-prev',
        keyboardControl: true,
        // CallBack functions
        // Might define onInit if necessary
        onTransitionStart: function() {
          $('.developer-connect-details').fadeOut(200);
        },
        onTransitionEnd: function() { 
          $('.developer-connect-details').fadeIn(300);
          var selectedUser = $('.swiper-slide-active').data('dev-id');
          var users = $scope.users;
          for (var i = 0; i < users.length; i++) {
            if (users[i].id === selectedUser) {
              $scope.selectedUser = users[i];
            }
          }
          $scope.$apply();
        },
      });
  });

  /* Taking this out until we can figure out how to make it work */

  socket.on('notify:potentialFriendSuccess', function(){
    return $timeout(function(){
      $scope.users.splice($scope.selectedUserIndex, 1)
      $scope.swiper.removeSlide($scope.selectedUserIndex)
    },1500)
  })

  $scope.connectionRequest = function(){
    $scope.selectedUserIndex = $scope.swiper.activeIndex;
    $('.swiper-slide-active').addClass('requested');
    return $http({
      method: 'POST',
      url: '/api/user/connection-request',
      data: { currentUser: $scope.user.user, 
              selectedUser: $scope.selectedUser
            }
    }).then(function successCallback(response) {
        socket.emit('notify:potentialFriend', {
          target: angular.copy($scope.selectedUser.username), currentUser: angular.copy($scope.user.user.username)
        })
    }, function errorCallback(response) {
      console.log('error: ', reponse);
    });
  };

  $scope.addFilter = function(tech, index) {
    $scope.selections.push(tech); 
    $scope.techList.splice(index, 1);
    $scope.searchText = '';
  }

  $scope.removeFilter = function(tech, index) {
    $scope.techList.push(tech); 
    $scope.selections.splice(index, 1);  
  }

  $scope.availabilityOn = function(val) {
    var cookie = $cookies.get('gitConnectDeltaKS');
    var cookieObj = Cookie.parseCookie(cookie);
    $scope.dataAvailability = {
      username: cookieObj.username,
      availability: "true"
    }

    // check if user is already into project
    $rootScope.$broadcast('hasProjectCheck');
  }
  
  // Get project status result and set availability 
  $rootScope.$on('hasProjectCheckReturn', function(event, hasProject) {

    if (hasProject) {
      $('#availabilityInfo').modal('show');
    } else {
      var cookie = $cookies.get('gitConnectDeltaKS');
      var cookieObj = Cookie.parseCookie(cookie);
      availabilityToggle.changeAvailability($scope.dataAvailability);
      // Update cooking value
      cookieObj.availability = "true";
      $cookies.put('gitConnectDeltaKS', JSON.stringify(cookieObj));
      //refresh to apply cookie to the view
      $window.location.reload();
    }
  });

  $scope.$watchCollection('users', function(newUsers, oldUsers){
    if(!newUsers.length){
      $scope.selectedUser = {};
    }
    newUsers.forEach(function(user){
      user.skills.forEach(function(skill){
        skill.nameEncoded = encodeURIComponent(skill.name)
      })
    })
  })

  $scope.availabilityOff = function() {
    var cookie = $cookies.get('gitConnectDeltaKS');
    var cookieObj = Cookie.parseCookie(cookie);
    var data = {
      username: cookieObj.username,
      availability: "false"
    }
    availabilityToggle.changeAvailability(data);

    // Update cookie value
    cookieObj.availability = "false";
    $cookies.put('gitConnectDeltaKS', JSON.stringify(cookieObj));
    //refresh to apply cookie to the view
    $window.location.reload();
  };

  $scope.googleMapInit = function() {
    // google.maps.event.addDomListener(window, 'load', addressInitialize);
    addressInitialize();
  };

  $scope.applyFilters = function(){
    $('#filters').modal('show');
  }

  $scope.submitFilters = function(){
    // Check to see if filters is empty and if so, return default results

    $('#filters').modal('hide');
    if(!$scope.selections.length){
      $scope.users = $scope.defaultUsers;      
    } else {

      // If filters is not empty --> submit a POST request with filters

      return $http({
        method: 'POST',
        url: '/api/user/:name/matches',
        data: {
          filters: $scope.selections,
          username: $scope.user.user.username
        }
      }).then(function successCallback(response) {
        $scope.users = response.data.matches;
      }, function errorCallback(response) {
        console.log('error: ', response);
      });
    }
  }

  function addressInitialize() {
    var input = document.getElementById('city-input');
    var autocomplete = new google.maps.places.Autocomplete(input, {types: ['(cities)']});
    autocomplete.addListener('place_changed', function() {
      // Get city name only
      var place = autocomplete.getPlace();

      cityId = place.place_id;
      cityName = place.name;
      // $('#user-location').val(place.name);
    });
  }

}]);

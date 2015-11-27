angular.module('myApp.collaboration-page', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/collaboration-page/:id', {
    authenticate: true,
    templateUrl: 'view/collaboration-page/collab.html',
    controller: 'collaboration-page',
    resolve: {
      getProjectInfo: ['$route', 'Project', function($route, Project) {
          return Project.getInfos($route.current.params.id);
      }],
      getProjectUsers: ['$route', 'Project', function($route, Project) {
          return Project.getUsers($route.current.params.id);
      }]
    }
  });
}])

.controller('collaboration-page', ['$scope', '$cookies', 'Cookie', 'socket', 'getProjectInfo', 'getProjectUsers', '$uibModal', 'Project', function($scope, $cookies, Cookie, socket, getProjectInfo, getProjectUsers, $uibModal, Project) {

  var projectInfos = getProjectInfo.project;
  $scope.projectInfos = projectInfos;
  
  var projectUsers = getProjectUsers;
  $scope.projectUsers = projectUsers.users;
  // console.log('project', projectInfos)
  console.log('users', projectUsers);

  var cookie = $cookies.get('gitConnectDeltaKS');
  var cookieObj = Cookie.parseCookie(cookie);
  $scope.username = cookieObj.username;
  console.log($scope.username);

  // $scope.projectInfos = {
  //   name: 'GitConnect',
  //   description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  //   tech: ['HTML5', 'JavaScript', 'Firebase', 'MySql'],
  //   github_url: 'https://github.com/deltathesis/gitconnect'
  //   }

  $scope.resources = {
    project_repo: 'https://github.com/deltathesis/gitconnect',
    scrum_board: 'https://trello.com/b/QNvGVucJ/gameplan',
    website: "",
    storage: "",
    database: "",
    code_library: ""
  }

  $scope.messages = [];

  $scope.currentTime;

  /** Socket Listeners **/

  socket.emit('initCollab', $scope.username);

  // listen to initializer
  socket.on('initCollab', function(data) {
    if(data) {
      $scope.messages = data.testRoom;
    }
  })

  //listens to sent message
  socket.on('send:collabMessage' , function(data) {
    $scope.messages.push(data);
  })

  $scope.messageSubmit = function(){
    if($scope.text){
    var currentTime = new Date();
      socket.emit('send:collabMessage', {
        message: $scope.text,
        date: currentTime
      })

      $scope.messages.push({
        username: $scope.username,
        message: $scope.text,
        date: currentTime
      });

      socket.emit('store:collabData', angular.copy({
        testRoom: $scope.messages
      }));

      $scope.text = "";
    }
  };

  // // Remove modal backdrop bug display
  // $scope.removeModal = function() {
  //   $('.modal-backdrop').remove();
  // }

  /***********************MODALS to publish your project ***************************/

  $scope.publish = function(size){
    var modalInstance = $uibModal.open({
      animation: $scope.animationsEnabled,
      templateUrl: 'view/collaboration-page/projectForm.html',
      controller: 'publish',
      resolve: {
        project: function(){
          return $scope.projectInfos
        }
      },
      size: size
    });

    modalInstance.result.then(function(projectInformation){
      console.log('project info: ', projectInformation);
      Project.updateProject(projectInformation, $scope.username);
    })
  }

}]);

angular.module('myApp.collaboration-page').controller('publish', ['$scope', '$uibModal', 'techList', '$uibModalInstance', 'project', function($scope, $uibModal, techList, $uibModalInstance, project){
  //for the drop down everytime the user clicks on a tech push it into an array and bind that to the modal
  $scope.projectInfo = project
  $scope.techList = techList.getTechList();
  // $scope.yourTechList = $scope.projectInfo.techlist
  $scope.yourTechList = []
  $scope.addTech = function(tech, index){
    if ($scope.yourTechList.indexOf(tech) !== -1) {
      $scope.techList.splice(index, 1);
    } else {
      $scope.yourTechList.push(tech);
      $scope.techList.splice(index, 1);
      $scope.searchText = '';
    }
  };
  $scope.removeTech = function(tech, index) {
    $scope.techList.push(tech); 
    $scope.user.languages.splice(index, 1);  
  };


  $scope.ok = function(){
    $scope.projectInfo.published = 'true';
    $uibModalInstance.close($scope.projectInfo);
  }
  $scope.cancel = function(){
    $uibModalInstance.dismiss('cancel');
  }
}]);


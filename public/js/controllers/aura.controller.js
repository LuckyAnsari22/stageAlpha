'use strict';
angular.module('stageAlpha')
.controller('AuraCtrl', ['$scope', '$location', '$window', '$timeout', 'ToastService', 
function($scope, $location, $window, $timeout, ToastService) {
  $scope.isListening = false;
  $scope.transcript = '';
  $scope.auraState = 'standby'; // standby, listening, processing
  
  var SpeechRecognition = $window.SpeechRecognition || $window.webkitSpeechRecognition;
  var synth = $window.speechSynthesis;
  var recognition = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = function() {
      $scope.$apply(function() {
        $scope.isListening = true;
        $scope.auraState = 'listening';
        $scope.transcript = 'Listening...';
      });
    };

    recognition.onresult = function(event) {
      var command = event.results[0][0].transcript.toLowerCase();
      $scope.$apply(function() {
        $scope.auraState = 'processing';
        $scope.transcript = '"' + command + '"';
      });
      processCommand(command);
    };

    recognition.onerror = function(event) {
      $scope.$apply(function() {
        $scope.isListening = false;
        $scope.auraState = 'standby';
        $scope.transcript = 'Error: ' + event.error;
      });
    };

    recognition.onend = function() {
      $scope.$apply(function() {
        $scope.isListening = false;
        if($scope.auraState !== 'processing') {
          $scope.auraState = 'standby';
        }
      });
    };
  }

  $scope.toggleAura = function() {
    if (!SpeechRecognition) {
      ToastService.show('Voice control is not supported in your browser. Use Chrome.', 'error');
      return;
    }
    if ($scope.isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  function speak(text) {
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1;
    utterance.rate = 1.05;
    synth.speak(utterance);
  }

  function processCommand(cmd) {
    var response = '';
    var redirect = null;

    if (cmd.includes('home') || cmd.includes('dashboard')) {
      response = "Navigating to central command.";
      redirect = '/';
    } 
    else if (cmd.includes('equipment') || cmd.includes('hardware')) {
      response = "Opening hardware catalog.";
      redirect = '/equipment';
    }
    else if (cmd.includes('overwatch') || cmd.includes('telemetry') || cmd.includes('live')) {
      response = "Initializing live telemetry overwatch sequence.";
      redirect = '/telemetry';
    }
    else if (cmd.includes('book') || cmd.includes('rent')) {
      response = "Opening booking interface.";
      redirect = '/booking';
    }
    else if (cmd.includes('admin') || cmd.includes('analytics')) {
      response = "Accessing secure administrative analytics.";
      redirect = '/admin';
    }
    else if (cmd.includes('hello') || cmd.includes('aura')) {
      response = "Hello. I am Aura, the StageAlpha Voice Interface. Say a command like 'Open Overwatch' or 'Show Hardware'.";
    }
    else if (cmd.includes('lockdown') || cmd.includes('protocol zero')) {
      response = "Warning. Protocol Zero initiated. Simulating security lockdown.";
      document.body.style.filter = "invert(1) hue-rotate(180deg)";
      $timeout(function() { document.body.style.filter = "none"; }, 3000);
    }
    else {
      response = "Command not recognized in the StageAlpha registry.";
    }

    if (response) {
      speak(response);
    }

    $timeout(function() {
      if (redirect) {
        $location.path(redirect);
      }
      $scope.auraState = 'standby';
      $scope.transcript = '';
    }, 1500);
  }
}]);

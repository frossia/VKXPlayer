'use strict';
var app;

VK.init({
  apiId: 4761529,
  appPermissions: 8
});

app = angular.module('app', ['ngAnimate', 'ngResource']);

app.service('Playlist', [
  '$q', '$resource', '$http', '$rootScope', function($q, $resource, $http, $rootScope) {
    var checkNested, getAll, promise, saveJson, t, updateForEverySong;
    t = this;
    promise = void 0;
    this.songsLoaded = 0;
    this.songs = [];
    this.audioC = 0;
    this.getJson = function() {
      if (!promise) {
        promise = $http.get('http://0.0.0.0:3000/songs.json').then(function(res) {
          t.songs = res.data;
          return res.data;
        });
      }
      return promise;
    };
    this.updateJson = function(songsToLoad) {
      return VK.Auth.login(function(response) {
        if (response.session) {
          return VK.Api.call('audio.get', {
            count: songsToLoad
          }, function(r) {
            var songs;
            if (r.response) {
              songs = r.response;
              return getAll(songs).then(function(datas) {
                console.log(songs);
                saveJson(songs);
                t.songs = songs;
              });
            }
          });
        }
      });
    };
    checkNested = function(obj) {
      var args, i;
      args = Array.prototype.slice.call(arguments, 1);
      i = 0;
      while (i < args.length) {
        if (!obj || !obj.hasOwnProperty(args[i])) {
          return false;
        }
        obj = obj[args[i]];
        i++;
      }
      return true;
    };
    getAll = function(songs) {
      var promises;
      promises = songs.map(function(song) {
        var artist, defer, title;
        artist = song.artist.replace("#", "");
        title = song.title.replace("#", "");
        song.playProgress = 0;
        song.playing = false;
        song.inPlaylist = false;
        defer = $q.defer();
        $http.get("http://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=09b98472116a6ab574aea3c4fe783b27&artist=" + artist + "&track=" + title + "&format=json").then((function(data) {
          var images;
          if (checkNested(data.data, 'track', 'album', 'image')) {
            images = data.data.track.album.image;
            song.images = images;
            song.image = images[images.length - 1]["#text"];
            defer.resolve(song);
          } else {
            return $http.get("http://ws.audioscrobbler.com/2.0/?method=artist.getInfo&api_key=09b98472116a6ab574aea3c4fe783b27&artist=" + artist + "&format=json").then((function(data) {
              if (checkNested(data.data, 'artist', 'image') && data.data.artist.image[data.data.artist.image.length - 1]["#text"] !== '') {
                images = data.data.artist.image;
                song.images = images;
                song.image = images[images.length - 1]["#text"];
              } else {
                song.images = [];
                song.image = 'images/vinyl.png';
              }
              defer.resolve(song);
            }));
          }
        }));
        return defer.promise.then((function(song) {
          t.songsLoaded++;
          return t.songs.push(song);
        }));
      });
      return $q.all(promises);
    };
    updateForEverySong = function(song) {
      t.songsLoaded++;
      console.log(song);
      return t.songs.push(song);
    };
    saveJson = function(songs) {
      return $http.post('http://0.0.0.0:3000/save_songs', JSON.stringify(songs)).success(function(data, status, headers, config) {
        return console.warn(data);
      }).error(function(data, status, headers, config) {
        return console.error(data);
      });
    };
  }
]);

app.controller('ctrlPlaylist', [
  '$scope', '$timeout', 'Playlist', function($scope, $timeout, Playlist) {
    $scope.$Playlist = Playlist;
    Playlist.getJson().then(function(d) {
      $scope.songs = d;
      $scope.playingSong = $scope.songs[1];
    });
    $scope.$watch('$Playlist.songsLoaded', function(newValue) {
      $scope.songsLoaded = newValue;
      return $scope.songsLoadedPercents = Math.floor(newValue / $scope.songsToLoad * 100) || 0;
    });
    $scope.$watch('$Playlist.songs', function(newValue) {
      console.log(newValue);
      $scope.songs = newValue;
      $scope.songsToLoad = Playlist.songs.length;
      return $timeout((function() {
        $scope.songsLoaded = 0;
        return Playlist.songsLoaded = 0;
      }), 2500);
    });
    $scope.updateJson = function() {
      $scope.songs = [];
      return $scope.$Playlist.updateJson($scope.songsToLoad);
    };
    $scope.playingSong = void 0;
    $scope.playlistAddRemove = function(song) {
      return song.inPlaylist = !song.inPlaylist;
    };
    $scope.play = function(song) {
      $scope.playingSong = song;
      return song.playing = !song.playing;
    };
    $scope.currentTime = 0;
  }
]);

app.directive('audioX', function($window, $timeout) {
  return {
    restrict: 'A',
    scope: {
      song: '=song',
      directiveCurrentTime: '=directiveCurrentTime'
    },
    controller: function($scope, $element) {
      $scope.onTimeUpdate = function() {
        var currTime;
        currTime = $element[0].currentTime;
        if (currTime - $scope.directiveCurrentTime > 0.5 || $scope.directiveCurrentTime - currTime > 0.5) {
          $element[0].currentTime = $scope.directiveCurrentTime;
        }
        $scope.$apply(function() {
          $scope.directiveCurrentTime = $element[0].currentTime;
          $scope.song.currentTime = $element[0].currentTime;
        });
      };
    },
    link: function(scope, element, attrs) {
      var a;
      scope.$watch((function() {
        return attrs.embedSrc;
      }), function() {
        element.attr('src', attrs.embedSrc);
      });
      a = element[0];
      a.volume = 0.04;
      a.ontimeupdate = function() {
        return scope.onTimeUpdate();
      };
    }
  };
});

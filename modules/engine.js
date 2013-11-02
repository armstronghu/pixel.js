// Copyright (C) 2013 rastating
//
// Version 0.0.3
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see http://www.gnu.org/licenses/.

PixelJS.Engine = function () {
    "use strict";
    
    this.scene = { container: undefined, width: 0, height: 0 };
    this._deltaTime = 0; // _deltaTime contains the time in fractional seconds since the last update
    this._events = { keydown: [], keyup: [] };
    this._layerKeys = [];
    this._layers = {};
    this._previousElapsedTime = 0;
    this._size = { width: 0, height: 0 };
    this._soundKeys = [];
    this._sounds = {};
    
    var self = this;
    document.onkeydown = function (e) {
        e = e || event; // Small hack to get the event args in IE
        var keyCode = e.keyCode;
        var listeners = self._events.keydown;
        if (listeners.length > 0) {
            listeners.forEach(function(listener) {
                listener(keyCode);
            });
        }
    };
    
    document.onkeyup = function (e) {
        e = e || event; // Small hack to get the event args in IE
        var keyCode = e.keyCode;
        var listeners = self._events.keyup;
        if (listeners.length > 0) {
            listeners.forEach(function(listener) {
                listener(keyCode);
            });
        }
    };
};

PixelJS.Engine.prototype._checkForCollissions = function () {
    for (var keyIndex = 0; keyIndex < this._layerKeys.length; keyIndex++) {
        // Check for collissions within the layer's own collidables
        var collidables = this._layers[this._layerKeys[keyIndex]]._collidables;
        for (var s = 0; s < collidables.length; s++) {
            for (var t = 0; t < collidables.length; t++) {
                if (s !== t) {
                    if (collidables[s].collidesWith(collidables[t])) {
                        collidables[s].onCollide(collidables[t]);
                    }
                }
            }
        }
        
        // Check for collissions with the other layers' collidables
        for (var k = 0; k < this._layerKeys.length; k++) {
            if (k !== keyIndex) {
                var otherCollidables = this._layers[this._layerKeys[k]]._collidables;
                for (var s = 0; s < collidables.length; s++) {
                    for (var t = 0; t < otherCollidables.length; t++) {
                        if (collidables[s].collidesWith(otherCollidables[t])) {
                            collidables[s].onCollide(otherCollidables[t]);
                        }
                    }
                }
            }
        }
    }
            
};

PixelJS.Engine.prototype._displayFPS = false;
PixelJS.Engine.prototype.maxDeltaTime = 100;

PixelJS.Engine.prototype._toggleFPSLayer = function () {
    if (this._displayFPS) {
        if (this._layers["__pixeljs_performanceLayer"] === undefined) {
            var layer = this.createLayer("__pixeljs_performanceLayer");
            var counter = new PixelJS.FPSCounter(layer);
            counter.pos = { x: 5, y: 20 };
            layer.addComponent(counter);
            layer.zIndex = 9999;
        }
        else {
            this._layers["__pixeljs_performanceLayer"].visible = true;
        }
    }
    else {
        if (this._layers["__pixeljs_performanceLayer"] !== undefined) {
            this._layers["__pixeljs_performanceLayer"].visible = false;
        }
    }
}

PixelJS.Engine.prototype.addSound = function (key, sound) {
    this._sounds[key] = sound;
};

PixelJS.Engine.prototype.createLayer = function (name) {
    var layer = new PixelJS.Layer(this);
    this._layers[name] = layer;
    this._layerKeys.push(name);
    return layer;
};

PixelJS.Engine.prototype.createSound = function (name) {
    var sound = new PixelJS.Sound();
    this._sounds[name] = sound;
    this._soundKeys.push(name);
    return sound;
}

PixelJS.Engine.prototype.init = function (info) {
    this.scene.container = document.getElementById(info.container);
    this.scene.width = info.width;
    this.scene.height = info.height;
    
    if (info.maxDeltaTime !== undefined) {
        this.maxDeltaTime = info.maxDeltaTime;
    }
};

PixelJS.Engine.prototype.on = function (event, callback) {
    this._events[event].push(callback);
};

PixelJS.Engine.prototype.loadScene = function (callback) {
    var loading = this._layerKeys.length;
    for (var k = 0; k < this._layerKeys.length; k++) {
        this._layers[this._layerKeys[k]].load(function () {
            loading -= 1;
            if (loading === 0) {
                callback();
            }
        });
    }
};

PixelJS.Engine.prototype.loadSounds = function (callback) {
    var loading = this._soundKeys.length;
    if (loading === 0) {
        callback();
    }
    else {
        for (var k = 0; k < this._soundKeys.length; k++) {
            var key = this._soundKeys[k];
            if (this._sounds[key]._canPlay) {
                loading -= 1;
                if (loading === 0) {
                    callback();
                }
            }
            else {
                this._sounds[key].load(this._sounds[key]._prepInfo, function () {
                    loading -= 1;
                    if (loading === 0) {
                        callback();
                    }
                });
            }
        }
    }
};

PixelJS.Engine.prototype.playSound = function (key) {
    this._sounds[key].play();
}

PixelJS.Engine.prototype.run = function (gameLoop) {
    var self = this;
    (function loop(elapsedTime) {
        requestAnimationFrame(loop);
        self._deltaTime = Math.min(elapsedTime - self._previousElapsedTime, self.maxDeltaTime) / 1000;
        
        if (!isNaN(self._deltaTime)) {
            for (var i = 0; i < self._layerKeys.length; i++) {
                self._layers[self._layerKeys[i]].update(elapsedTime, self._deltaTime);
            }
            
            self._checkForCollissions();
            
            gameLoop(elapsedTime, self._deltaTime);
            
            for (var i = 0; i < self._layerKeys.length; i++) {
                self._layers[self._layerKeys[i]].draw();
            }
        }
        
        self._previousElapsedTime = elapsedTime;
    }());
};

Object.defineProperty(PixelJS.Engine.prototype, "deltaTime", {
    get: function () { return this._deltaTime; },
    configurable: false,
    enumerable: false
});

Object.defineProperty(PixelJS.Engine.prototype, "displayFPS", {
    get: function () { return this._displayFPS; },
    set: function (val) {
        this._displayFPS = val;
        this._toggleFPSLayer();
    },
    configurable: false,
    enumerable: false
});
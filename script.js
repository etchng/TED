// Component that detects and emits events for touch gestures

AFRAME.registerComponent("gesture-detector", {
  schema: {
    element: { default: "" }
  },

  init: function () {
    this.targetElement =
      this.data.element && document.querySelector(this.data.element);

    if (!this.targetElement) {
      this.targetElement = this.el;
    }

    this.internalState = {
      previousState: null
    };

    this.emitGestureEvent = this.emitGestureEvent.bind(this);

    this.targetElement.addEventListener("touchstart", this.emitGestureEvent);

    this.targetElement.addEventListener("touchend", this.emitGestureEvent);

    this.targetElement.addEventListener("touchmove", this.emitGestureEvent);
  },

  remove: function () {
    this.targetElement.removeEventListener("touchstart", this.emitGestureEvent);

    this.targetElement.removeEventListener("touchend", this.emitGestureEvent);

    this.targetElement.removeEventListener("touchmove", this.emitGestureEvent);
  },

  emitGestureEvent(event) {
    const currentState = this.getTouchState(event);

    const previousState = this.internalState.previousState;

    const gestureContinues =
      previousState &&
      currentState &&
      currentState.touchCount == previousState.touchCount;

    const gestureEnded = previousState && !gestureContinues;

    const gestureStarted = currentState && !gestureContinues;

    if (gestureEnded) {
      const eventName =
        this.getEventPrefix(previousState.touchCount) + "fingerend";

      this.el.emit(eventName, previousState);

      this.internalState.previousState = null;
    }

    if (gestureStarted) {
      currentState.startTime = performance.now();

      currentState.startPosition = currentState.position;

      currentState.startSpread = currentState.spread;

      const eventName =
        this.getEventPrefix(currentState.touchCount) + "fingerstart";

      this.el.emit(eventName, currentState);

      this.internalState.previousState = currentState;
    }

    if (gestureContinues) {
      const eventDetail = {
        positionChange: {
          x: currentState.position.x - previousState.position.x,

          y: currentState.position.y - previousState.position.y
        }
      };

      if (currentState.spread) {
        eventDetail.spreadChange = currentState.spread - previousState.spread;
      }

      // Update state with new data

      Object.assign(previousState, currentState);

      // Add state data to event detail

      Object.assign(eventDetail, previousState);

      const eventName =
        this.getEventPrefix(currentState.touchCount) + "fingermove";

      this.el.emit(eventName, eventDetail);
    }
  },

  getTouchState: function (event) {
    if (event.touches.length === 0) {
      return null;
    }

    // Convert event.touches to an array so we can use reduce

    const touchList = [];

    for (let i = 0; i < event.touches.length; i++) {
      touchList.push(event.touches[i]);
    }

    const touchState = {
      touchCount: touchList.length
    };

    // Calculate center of all current touches

    const centerPositionRawX =
      touchList.reduce((sum, touch) => sum + touch.clientX, 0) /
      touchList.length;

    const centerPositionRawY =
      touchList.reduce((sum, touch) => sum + touch.clientY, 0) /
      touchList.length;

    touchState.positionRaw = { x: centerPositionRawX, y: centerPositionRawY };

    // Scale touch position and spread by average of window dimensions

    const screenScale = 2 / (window.innerWidth + window.innerHeight);

    touchState.position = {
      x: centerPositionRawX * screenScale,
      y: centerPositionRawY * screenScale
    };

    // Calculate average spread of touches from the center point

    if (touchList.length >= 2) {
      const spread =
        touchList.reduce((sum, touch) => {
          return (
            sum +
            Math.sqrt(
              Math.pow(centerPositionRawX - touch.clientX, 2) +
                Math.pow(centerPositionRawY - touch.clientY, 2)
            )
          );
        }, 0) / touchList.length;

      touchState.spread = spread * screenScale;
    }

    return touchState;
  },

  getEventPrefix(touchCount) {
    const numberNames = ["one", "two", "three", "many"];

    return numberNames[Math.min(touchCount, 4) - 1];
  }
});

/* global AFRAME, THREE */

AFRAME.registerComponent("gesture-handler", {
  schema: {
    enabled: { default: true },
    rotationFactor: { default: 5 },
    minScale: { default: 0.3 },
    maxScale: { default: 8 }
  },

  init: function () {
    this.handleScale = this.handleScale.bind(this);
    this.handleRotation = this.handleRotation.bind(this);

    this.isVisible = false;
    this.initialScale = this.el.object3D.scale.clone();
    this.scaleFactor = 1;

    this.el.sceneEl.addEventListener("markerFound", (e) => {
      this.isVisible = true;
    });

    this.el.sceneEl.addEventListener("markerLost", (e) => {
      this.isVisible = false;
    });
  },

  update: function () {
    if (this.data.enabled) {
      this.el.sceneEl.addEventListener("onefingermove", this.handleRotation);
      this.el.sceneEl.addEventListener("twofingermove", this.handleScale);
    } else {
      this.el.sceneEl.removeEventListener("onefingermove", this.handleRotation);
      this.el.sceneEl.removeEventListener("twofingermove", this.handleScale);
    }
  },

  remove: function () {
    this.el.sceneEl.removeEventListener("onefingermove", this.handleRotation);
    this.el.sceneEl.removeEventListener("twofingermove", this.handleScale);
  },

  handleRotation: function (event) {
    if (this.isVisible) {
      this.el.object3D.rotation.y +=
        event.detail.positionChange.x * this.data.rotationFactor;
      this.el.object3D.rotation.x +=
        event.detail.positionChange.y * this.data.rotationFactor;
    }
  },

  handleScale: function (event) {
    if (this.isVisible) {
      this.scaleFactor *=
        1 + event.detail.spreadChange / event.detail.startSpread;

      this.scaleFactor = Math.min(
        Math.max(this.scaleFactor, this.data.minScale),
        this.data.maxScale
      );

      this.el.object3D.scale.x = this.scaleFactor * this.initialScale.x;
      this.el.object3D.scale.y = this.scaleFactor * this.initialScale.y;
      this.el.object3D.scale.z = this.scaleFactor * this.initialScale.z;
    }
  }
});

// window.onload = () => {
//   document.documentElement.requestFullscreen();

// };

var robotLabel = document.querySelector("#robot-text");

document.addEventListener("DOMContentLoaded", function () {
  var scene = document.querySelector("a-scene");
  var splash = document.querySelector("#splash");
  scene.addEventListener("loaded", function (e) {
    splash.style.display = "none";
  });
});

var instructions = document.querySelector(".instructions");

instructions.addEventListener("click", function () {
  instructions.classList.add("active");
});

var playButton = document.querySelector(".play-button");
var playBorder = document.querySelector(".play-border");

// playButton.classList.add("paused");

var playpause = document.querySelector(".play-btn");

// playButton.classList.toggle("paused");
// playBorder.classList.toggle("active");

playpause.addEventListener("click", function () {
  playButton.classList.toggle("paused");
  playpause.classList.toggle("active");
  playBorder.classList.toggle("active");
});

var playtoggle = true;

playpause.addEventListener("click", function (e) {
  var model = document.querySelector("#bowser-model");
  var birdModel = document.querySelector("#bird-model");
  var ventModel = document.querySelector("#ventricle-model");
  var aortic1 = document.querySelector("#aortic1-model");
  var aortic2 = document.querySelector("#aortic2-model");
  var aortic3 = document.querySelector("#aortic3-model");
  var labelIE = document.querySelector("#robot-text-2");
  var flow2 = document.querySelector("#flow2-model");
  var flow2 = document.querySelector("#flow2-model");
  var bflo = document.querySelector("#bflo1-model");
  if (playtoggle == false) {
    playtoggle = true;
    document
      .querySelector("#bowser-model")
      .setAttribute("animation-mixer", { timeScale: 1 });
    document
      .querySelector("#bird-model")
      .setAttribute("animation-mixer", { timeScale: 1 });
    document
      .querySelector("#ventricle-model")
      .setAttribute("animation-mixer", { timeScale: 1 });
    document
      .querySelector("#aortic1-model")
      .setAttribute("animation-mixer", { timeScale: 1 });
    document
      .querySelector("#aortic2-model")
      .setAttribute("animation-mixer", { timeScale: 1 });
    document
      .querySelector("#aortic3-model")
      .setAttribute("animation-mixer", { timeScale: 1 });
    document
      .querySelector("#robot-text-2")
      .setAttribute("animation-mixer", { timeScale: 1 });
    document
      .querySelector("#flow2-model")
      .setAttribute("animation-mixer", { timeScale: 1 });
    document
      .querySelector("#bflo1-model")
      .setAttribute("animation-mixer", { timeScale: 1 });
  } else {
    playtoggle = false;
    document
      .querySelector("#bowser-model")
      .setAttribute("animation-mixer", { timeScale: 0 });
    document
      .querySelector("#bird-model")
      .setAttribute("animation-mixer", { timeScale: 0 });
    document
      .querySelector("#ventricle-model")
      .setAttribute("animation-mixer", { timeScale: 0 });
    document
      .querySelector("#aortic1-model")
      .setAttribute("animation-mixer", { timeScale: 0 });
    document
      .querySelector("#aortic2-model")
      .setAttribute("animation-mixer", { timeScale: 0 });
    document
      .querySelector("#aortic3-model")
      .setAttribute("animation-mixer", { timeScale: 0 });
    document
      .querySelector("#robot-text-2")
      .setAttribute("animation-mixer", { timeScale: 0 });
    document
      .querySelector("#flow2-model")
      .setAttribute("animation-mixer", { timeScale: 0 });
    document
      .querySelector("#bflo1-model")
      .setAttribute("animation-mixer", { timeScale: 0 });
  }
});

// var switchOuter = document.querySelector(".toggle-outer");
// var switchInner = document.querySelector(".toggle-inner");

// document.querySelector(".toggle-outer").addEventListener("click", function () {
//   document.querySelector(".toggle-inner").classList.toggle("active");
//     document.querySelector(".toggle-outer").classList.toggle("active");

// });

var hidden = document.querySelector(".vis-btn");

hidden.addEventListener("click", function () {
  document.querySelector("#eye-outer").classList.toggle("active");
  hidden.classList.toggle("active");
  if (hidden.classList.contains("active")) {
    document.querySelector("#aortic1-model").setAttribute("visible", false);
    document.querySelector("#aortic2-model").setAttribute("visible", false);
    document.querySelector("#aortic3-model").setAttribute("visible", false);
    document.querySelector("#ventricle-model").setAttribute("visible", false);
  } else {
    document.querySelector("#aortic1-model").setAttribute("visible", true);
    document.querySelector("#aortic2-model").setAttribute("visible", true);
    document.querySelector("#aortic3-model").setAttribute("visible", true);
    document.querySelector("#ventricle-model").setAttribute("visible", true);
  }
  // document.querySelector(".toggle-inner").classList.toggle("active");
  // document.querySelector(".toggle-outer").classList.toggle("active");
});

var swap = document.querySelector(".switch-btn");
var healthy = document.querySelector(".healthy-inner");
// var switchOuter = document.querySelector(".toggle-outer");
// var switchInner = document.querySelector(".toggle-inner");

// swap.addEventListener("click", function () {
//   document.querySelector(".toggle-inner").classList.toggle("active");
//   document.querySelector(".toggle-outer").classList.toggle("active");
// });

swap.addEventListener("click", function () {
  swap.classList.add("active");
  healthy.classList.add("active");
  // document.querySelector(".toggle-inner").classList.toggle("active");
  // document.querySelector(".toggle-outer").classList.toggle("active");
});

// swap.addEventListener("click", function () {
//   swap.classList.toggle("active");
// });

// var model = document.querySelector("#bowser-model");
//     var birdModel = document.querySelector("#bird-model");

swap.addEventListener("click", function () {
  document.querySelector("#bowser-model").setAttribute("visible", false);
  document.querySelector("#bird-model").setAttribute("visible", true);
  if (visLabel.classList.contains("active")) {
    document.querySelector("#robot-text").setAttribute("visible", false);
    document.querySelector("#robot-text-2").setAttribute("visible", true);
  } else {
    document.querySelector("#robot-text").setAttribute("visible", false);
    document.querySelector("#robot-text-2").setAttribute("visible", false);
  }
  if (flow.classList.contains("active")) {
    document.querySelector("#flow2-model").setAttribute("visible", true);
    document.querySelector("#bflo1-model").setAttribute("visible", true);
  } else {
    document.querySelector("#flow2-model").setAttribute("visible", false);
    document.querySelector("#bflo1-model").setAttribute("visible", false);
  }
});

healthy.addEventListener("click", function () {
  swap.classList.remove("active");
  healthy.classList.remove("active");

  document.querySelector("#bowser-model").setAttribute("visible", true);
  document.querySelector("#bird-model").setAttribute("visible", false);
  if (visLabel.classList.contains("active")) {
    document.querySelector("#robot-text").setAttribute("visible", true);
    document.querySelector("#robot-text-2").setAttribute("visible", false);
  } else {
    document.querySelector("#robot-text").setAttribute("visible", false);
    document.querySelector("#robot-text-2").setAttribute("visible", false);
  }
  if (flow.classList.contains("active")) {
    document.querySelector("#flow2-model").setAttribute("visible", true);
    document.querySelector("#bflo1-model").setAttribute("visible", false);
  } else {
    document.querySelector("#flow2-model").setAttribute("visible", false);
    document.querySelector("#bflo1-model").setAttribute("visible", false);
  }
});

var visLabel = document.querySelector(".label-btn");

visLabel.addEventListener("click", function () {
  visLabel.classList.toggle("active");
  document.querySelector("#Union_2").classList.toggle("active");
  document.querySelector("#Union").classList.toggle("active");
  if (visLabel.classList.contains("active")) {
    if (swap.classList.contains("active")) {
      document.querySelector("#robot-text").setAttribute("visible", false);
      document.querySelector("#robot-text-2").setAttribute("visible", true);
    } else {
      document.querySelector("#robot-text").setAttribute("visible", true);
      document.querySelector("#robot-text-2").setAttribute("visible", false);
    }
  } else {
    document.querySelector("#robot-text").setAttribute("visible", false);
    document.querySelector("#robot-text-2").setAttribute("visible", false);
  }
});
var flow = document.querySelector(".flow-btn");

flow.addEventListener("click", function () {
  flow.classList.toggle("active");
  document.querySelector("#drop").classList.toggle("active");
  document.querySelector("#back-circle").classList.toggle("active");
  document.querySelector("#arrow").classList.toggle("active");
  if (flow.classList.contains("active")) {
    if (swap.classList.contains("active")) {
      document.querySelector("#flow2-model").setAttribute("visible", true);
      document.querySelector("#bflo1-model").setAttribute("visible", true);
    } else {
      document.querySelector("#flow2-model").setAttribute("visible", true);
      document.querySelector("#bflo1-model").setAttribute("visible", false);
    }
  } else {
    document.querySelector("#flow2-model").setAttribute("visible", false);
    document.querySelector("#bflo1-model").setAttribute("visible", false);
  }
});

// var labelToggle = false;
// // var model = document.querySelector("#bowser-model");
// //     var birdModel = document.querySelector("#bird-model");

var fullscreen = document.querySelector(".full-btn");
var fulltoggle = false;

fullscreen.addEventListener("click", function () {
  fullscreen.classList.toggle("active");
  document.querySelector("#top_right").classList.toggle("active");
  document.querySelector("#top_left").classList.toggle("active");
  document.querySelector("#bottom_right").classList.toggle("active");
  document.querySelector("#bottom_left").classList.toggle("active");

  if (fulltoggle == false) {
    fulltoggle = true;
    document.documentElement.requestFullscreen();
  } else {
    fulltoggle = false;
    document.exitFullscreen();
  }

  // document.documentElement.requestFullscreen()
});

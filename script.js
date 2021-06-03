'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type'); // Running or Cycling
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  // Declaration fields is experimental for this moment
  date = new Date();
  id = Date.now() + ''; // In real world with some users, we need to use another strategy to manage ID.
  type;
  clicks = 0;

  constructor(coords, distance, duration, type) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.type = type;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration, 'running');
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration, 'cycling');
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km / h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert('Could not get your position !')
      );
    }
  }

  _loadMap(position) {
    const coords = [position.coords.latitude, position.coords.longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(
      this.#map
    );

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Once the map is loaded, we can add all markers from workouts array
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
      this._renderWorkout(workout);
    });
  }

  _showForm(event) {
    this.#mapEvent = event;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');

    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputCadence.parentElement.classList.toggle('form__row--hidden');
    inputElevation.parentElement.classList.toggle('form__row--hidden');
  }

  _newWorkout(event) {
    event.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositives = (...inputs) => inputs.every(inp => inp >= 0);

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Get latitude and longitude
    const { lat, lng } = this.#mapEvent.latlng;

    let newWorkout;

    // If activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Chek if data is valide
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers !');

      newWorkout = new Running([lat, lng], distance, duration, cadence);
    }

    // If activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Chek if data is valide
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositives(distance, duration)
      )
        return alert('Inputs have to be positive numbers !');

      newWorkout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(newWorkout);

    // Render workout on map as maker
    this._renderWorkoutMarker(newWorkout);

    // Render workout on list
    this._renderWorkout(newWorkout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkout(workout) {
    const newElementList = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${
            workout.type === 'running'
              ? Math.round(workout.pace)
              : Math.round(workout.speed)
          }</span>
          <span class="workout__unit">${
            workout.type === 'running' ? 'min/km' : 'km/h'
          }</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🦶' : '🏔'
          }</span>
          <span class="workout__value">178</span>
          <span class="workout__unit">${
            workout.type === 'running' ? 'spm' : 'm'
          }</span>
        </div>
      </li>
    `;

    form.insertAdjacentHTML('afterend', newElementList);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
      )
      .openPopup();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return; // Verify that the user click on a valid element in the DOM

    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
  }
}

const app = new App();

import { useState } from "react";
import "./CalendrierComplet.css";

const fakeEvents = [
  {
    id: 1,
    title: "Conférence",
    day: 0,
    start: 10,
    end: 11,
  },
  {
    id: 2,
    title: "Meeting",
    day: 1,
    start: 14,
    end: 15,
  },
  {
    id: 3,
    title: "Formation React",
    day: 2,
    start: 9,
    end: 12,
  },
  {
    id: 4,
    title: "Lunch",
    day: 0,
    start: 12,
    end: 13,
  },
  {
    id: 5,
    title: "Event soirée",
    day: 5,
    start: 19,
    end: 22,
  },
];

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h → 20h
const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function Calendar() {
  const [currentWeek, setCurrentWeek] = useState(0);

  const nextWeek = () => setCurrentWeek((prev) => prev + 1);
  const prevWeek = () => setCurrentWeek((prev) => prev - 1);
  const resetWeek = () => setCurrentWeek(0);

  return (
    <div className="calendar">
      {/* HEADER */}
      <div className="calendar__header">
        <div className="calendar__nav">
          <button onClick={resetWeek}>Today</button>
          <button onClick={prevWeek}>Back</button>
          <button onClick={nextWeek}>Next</button>
        </div>

        <h2>Semaine {currentWeek + 1}</h2>
      </div>

      {/* DAYS */}
      <div className="calendar__days">
        {days.map((day, index) => (
          <div key={index} className="calendar__day">
            {day}
          </div>
        ))}
      </div>

      {/* GRID */}
      <div className="calendar__grid">
        {/* HOURS */}
        <div className="calendar__hours">
          {hours.map((hour) => (
            <div key={hour} className="calendar__hour">
              {hour}:00
            </div>
          ))}
        </div>

        {/* DAYS COLUMNS */}
        <div className="calendar__columns">
          {days.map((_, dayIndex) => (
            <div key={dayIndex} className="calendar__column">
              {hours.map((hour) => (
                <div key={hour} className="calendar__cell"></div>
              ))}

              {/* EVENTS */}
              {fakeEvents
                .filter((event) => event.day === dayIndex)
                .map((event) => (
                  <div
                    key={event.id}
                    className="calendar__event"
                    style={{
                      top: `${(event.start - 8) * 60}px`,
                      height: `${(event.end - event.start) * 60}px`,
                    }}
                  >
                    {event.title}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
/**
 * Provides a software based running clock for the time and date for the micro:bit. 
 * The micro:bit doesn't have a true real-time clock.  In order to minimize power consumption, this relies on an imprecise clock.
 * The margin of error is +/- 22 seconds per 24-hour period and will vary from micro:bit to micro:bit and based on temperature.
 *
 * @author Bill Siever
 */

enum MornNight {
    //% block="am"
    AM,
    //% block="pm"
    PM
}

enum TimeUnit {
    //% block="ms"
    Milliseconds,
    //% block="Seconds"
    Seconds,
    //% block="Minutes"
    Minutes,
    //% block="Hours"
    Hours,
    //% block="Days"
    Days
}

enum TimeFormat {
    //% block="with am / pm"
    AMPM,
    //% block="as 24-hr"
    HHMM24hr
}

enum DateFormat {
    //% block="as Month/Day"
    MD,
    //% block="as Month/Day/Year"
    MDYYYY,
    //% block="as YEAR-MONTH-DAY"
    YYYY_MM_DD
}

/**
 * Provides a running clock for the time and date.  
 * The micro:bit doesn't have a true real-time clock.  In order to minimize power consumption, this relies on an imprecise clock.
 * The margin of error is +/- 22 seconds per 24-hour period and will vary from micro:bit to micro:bit and based on temperature.
 * 
 */
//% color="#AA278D"  icon="\uf017"
namespace timeAndDate {


    interface DateTime {
      month: number  // 1-12 Month of year
      day:   number  // 1-31 / Day of month
      year:  number  // Assumed to be 2020 or later
      hour:  number  // 0-23 / 24-hour format  
      minute: number // 0-59 
      second: number // 0-59
      dayOfYear: number // 1-366
    }
    // ********* State Variable ************************

    // State variables to manage time 
    let startYear = 0
    let timeToSetpoint = 0
    let cpuTimeAtSetpoint = 0
/*

  Start year          Time Date/Time set        CurrentCPUTime
  |                   | (in s)                  | (in s)
  V                   V                         V
  |-------------------+-------------------------|
                      ^
                      |
                      Known dd/mm/yy hh:mm,.s
                      AND cpuTimeAtSetpoint (in s)
   |------------------|-------------------------|
      timeToSetpoint          deltaTime
      (in s)                  ( in s)

    setDate sets the start year and update timeToSetpoint and cpuTimeAtSetpoint 
    setTime methods update just timeToSetpoint and cpuTimeAtSetpoint
 */

    // Cummulative Days of Year (cdoy): Table of month (1-based indices) to cummulative completed days prior to month
    const cdoy = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]





    // ********* Time Calculation / Management ************************

    function isLeapYear(y: number) : boolean {
        return (y % 400 == 0 || (y % 100 != 0 && y % 4 == 0))
    }

    function dateToDayOfYear(m: number, d: number, y: number) {
        // Assumes a valid date
        let dayOfYear = cdoy[m] + d
        // Handle after Feb in leap years:
        if(m>2 && isLeapYear(y)) {
            dayOfYear += 1
        }
        return dayOfYear
    }

    // Returns a DateTime with just Month/Year (others 0)
    function dayOfYearToMonthAndDay(d: number, y: number): DateTime {
        // If it's after Feb in a leap year, adjust
        if(isLeapYear(y)) { 
            if(d==60) {
                return {month: 2, day: 29, year:0, hour:0, minute: 0, second: 0, dayOfYear:0}
            } else if(d>60) {
                d -= 1  // Adjust for leap day
            }
        }
        for (let i = 1; i < cdoy.length; i++) {  // Adjust for 1- based index
            // If the day lands in (not through) this month, return it
            if(d<=cdoy[i + 1]) {
                return { month: i, day: d - cdoy[i], year: 0, hour: 0, minute: 0, second: 0, dayOfYear: 0 }
                
            }
        }
        return { month: -1, day: -1, year: 0, hour: 0, minute: 0, second: 0, dayOfYear: 0 }
    }

    function secondsSoFarForYear(m: number, d: number, y: number, hh: number, mm: number, ss:number): number {
        // ((((Complete Days * 24hrs/ day)+complete hours)*60min/ hr)+complete minutes)* 60s/ min + complete seconds
        return (((dateToDayOfYear(m, d, y) - 1) * 24 + hh) * 60 + mm) * 60 + ss
    }

    function timeFor(cpuTime: number): DateTime {
        const deltaTime = cpuTime - cpuTimeAtSetpoint
        let sSinceStartOfYear = timeToSetpoint + deltaTime
        // Find elapsed years by counting up from start year and subtracting off complete years
        let y = startYear
        let leap = isLeapYear(y)
        while ((!leap && sSinceStartOfYear > 365 * 24 * 60 * 60) || (sSinceStartOfYear > 366 * 24 * 60 * 60)) {
            if(leap) {
                sSinceStartOfYear -= 366 * 24 * 60 * 60 
            } else {
                sSinceStartOfYear -= 365 * 24 * 60 * 60
            }
            y += 1
            leap = isLeapYear(y)
        }

        // sSinceStartOfYear and leap are now for "y", not "year"
        // Find elapsed days
        const daysFromStartOfYear = Math.idiv(sSinceStartOfYear,(24*60*60))+1  // Offset for 1/1 being day 1
        const secondsSinceStartOfDay = sSinceStartOfYear % (24 * 60 * 60)

        // Find elapsed hours
        const hoursFromStartOfDay = Math.idiv(secondsSinceStartOfDay,(60*60))
        const secondsSinceStartOfHour = secondsSinceStartOfDay % (60 * 60)

        // Find elapsed minutes
        const minutesFromStartOfHour = Math.idiv(secondsSinceStartOfHour,(60))
        // Find elapsed seconds
        const secondsSinceStartOfMinute = secondsSinceStartOfHour % (60)

        // Convert days to dd/ mm
        const ddmm = dayOfYearToMonthAndDay(daysFromStartOfYear, y) // current year, y, not start year
        return {month: ddmm.month, day: ddmm.day, year: y, hour: hoursFromStartOfDay, minute: minutesFromStartOfHour, second: secondsSinceStartOfMinute, dayOfYear: daysFromStartOfYear}
    }

    // TODO: This will map to a shim and more accurate version on MB (in C++)
    function timeInSeconds() : number {
        return Math.idiv(input.runningTime(),1000)
    }





    // ********* Misc. Utility Functions for formatting ************************
    function leftZeroPadTo(inp: number, digits: number) {
        let value = inp + ""
        while (value.length < digits) {
            value = "0" + value
        }
        return value
    }

    function dayOfWeek(m: number, d: number, y: number): number {
        // f = k + [(13 * m - 1) / 5] + D + [D / 4] + [C / 4] - 2 * C.
        // Zeller's Rule from http://mathforum.org/dr.math/faq/faq.calendar.html
        let D = y % 100
        let C = Math.idiv(y, 100)
        // Use integer division
        return d + Math.idiv((13 * m - 1), 5) + D + Math.idiv(D, 4) + Math.idiv(C, 4) - 2 * C
    }

    function fullTime(t: DateTime): string {
        return leftZeroPadTo(t.hour, 2) + ":" + leftZeroPadTo(t.minute, 2) + "." + leftZeroPadTo(t.second, 2)
    }

    function fullYear(t: DateTime): string {
        return leftZeroPadTo(t.year, 4) + "-" + leftZeroPadTo(t.month, 2) + "-" + leftZeroPadTo(t.day, 2)
    }




    // ********* Exposed blocks ************************

/*
     * You can "Set" the clock either by:
     *     a) Programming the micro:bit by setting a date/time that will happen soon in the setup, then pressing the
     *        reset button on the back of the micro:bit approximately 2 seconds before that time.
     *        For example, program the micro:bit using 13:00 (1pm) in the setup.  Hit the reset button
     *        on the back of the micro:bit at 12:59.58 in order for it to start time keeping at 13:00.00
     *     b) Use the "advance time by" block in conjunction with events to allow the time to increase or decreast.
     *        For example, use the A and B buttons to add or subtract a minute.
*/

    /**
     * Set the time using 24-hour format
     * @param hour the hour (0-23)
     * @param minute the minute (0-59)
     * @param second the second (0-59)
     */
    //% block="set time from 24-hour time |  %hour | : %minute | . %second"
    //% hour.min=0 hour.max=23 hour.defl=13
    //% minute.min=0 minute.max=59 minute.defl=30
    //% second.min=0 second.max=59 second.defl=0
    export function set24HourTime(hour: number, minute: number, second: number) {
        const cpuTime = timeInSeconds()
        const t = timeFor(cpuTime)
        cpuTimeAtSetpoint = cpuTime
        timeToSetpoint = secondsSoFarForYear(t.month, t.day, t.year, hour, minute, second)
    }

    //% block="set date to | Month %month | / Day %day | / Year %year"
    //% month.min=1 month.max=12 month.defl=1
    //% day.min=1 day.max=31 day.defl=20
    //% year.min=2020 year.max=2050 year.defl=2020
    export function setDate(month: number, day: number, year: number) {
        const cpuTime = timeInSeconds()
        const t = timeFor(cpuTime)
        startYear = year
        cpuTimeAtSetpoint = cpuTime
        timeToSetpoint = secondsSoFarForYear(month, day, startYear, t.hour, t.minute, t.second)
    }

    //% block="set time to |  %hour | : %minute | . %second | %ampm"
    //% hour.min=1 hour.max=12 hour.defl=11
    //% minute.min=0 minute.max=59 minute.defl=30
    //% second.min=0 second.max=59 second.defl=0
    //% inlineInputMode=inline
    export function setTime(hour: number, minute: number, second: number, ampm: MornNight) {
        // Adjust to 24-hour time format
        if (ampm == MornNight.AM && hour == 12) {  // 12am -> 0 hundred hours
            hour = 0;
        } else if (hour < 12) {        // PMs other than 12 get shifted after 12:00 hours
            hour = hour + 12;
        }
        set24HourTime(hour, minute, second);     
    }

    // This can cause overflow or underflow (adding 1 minute could change the hour)
    // Add or subtract time with the given unit. 
    //% block="advance time/date by | %amount | %unit "
    export function advanceBy(amount: number, unit: TimeUnit) {
        const units = [0, 1, 60 * 1, 60 * 60 * 1, 24 * 60 * 60 * 1]
        serial.writeLine(""+unit)
        cpuTimeAtSetpoint -= amount * units[unit]
    }

    //% block="current time as numbers $hour:$minute.$second on $weekday, $day/$month/$year, $dayOfYear" advanced=true
    //% draggableParameters=variable
    //% handlerStatement=1
    export function numericTime(handler: (hour: number, minute: number, second: number, weekday: number, day: number, month: number, year: number, dayOfYear: number) => void) {
        const cpuTime = timeInSeconds()
        const t = timeFor(cpuTime)
        handler(t.hour, t.minute, t.second, dayOfWeek(t.month, t.day, t.year), t.day, t.month, t.year, t.dayOfYear)
    }

    //% block="current time $format"
    export function time(format: TimeFormat): string {
        const cpuTime = timeInSeconds()
        const t = timeFor(cpuTime)
        switch(format) {
            case TimeFormat.HHMM24hr:
                return fullTime(t)
                break
            case TimeFormat.AMPM:
                let hour = t.hour
                let ap = t.hour<12 ? "am" : "pm"
                if(t.hour==0) {
                    hour = 12  // am
                } else if(hour>12) {
                    hour = t.hour-12
                }
                return hour + ":" + leftZeroPadTo(t.minute, 2) + "." + leftZeroPadTo(t.second, 2) + ap
                break
        }
    }

    //% block="current date formatted $format"
    export function date(format: DateFormat): string {
        const cpuTime = timeInSeconds()
        const t = timeFor(cpuTime)
        switch(format) {
            case DateFormat.MD:
                return t.month + "/" + t.day
                break
            case DateFormat.MDYYYY:
                return t.month + "/" + t.day + "/" + t.year
                break
            case DateFormat.YYYY_MM_DD:
                return fullYear(t)
                break
        }
        return ""
    }

    //% block="date and time stamp"
    export function dateTime(): string {
        const cpuTime = timeInSeconds()
        const t = timeFor(cpuTime)
        return fullYear(t) + " " + fullTime(t)
    }

    //% block="minute changed" advanced=true
    export function onMinuteChanged(handler: () => void) {

    }

    // }
    //% block="hour changed" advanced=true
    export function onHourChanged(handler: () => void) {

    }
    //% block="day changed" advanced=true
    export function onDayChanged(handler: () => void) {

    }

}
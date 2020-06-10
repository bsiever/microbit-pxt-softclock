/**
 * Bill Siever
 * 
 * This code is released under the [MIT License](http://opensource.org/licenses/MIT).
 * Please review the LICENSE.md file included with this example. If you have any questions
 * or concerns with licensing, please contact techsupport@sparkfun.com.
 * Distributed as-is; no warranty is given.
 */

#include "pxt.h"

#include "Microbit.h"
extern Microbit uBit;

using namespace pxt;

#define DEBUG 1

#ifdef DEBUG
    /**
     * 
     */
// https://www.forward.com.au/pfod/microbit/gettingStarted.html
    void loopUntilSent(ManagedString str) {
    int rtn = uBit.serial.send(str);
    while(rtn == MICROBIT_SERIAL_IN_USE) {
       uBit.sleep(0); // let other tasks run
       rtn = uBit.serial.send(str); 
    }
}
    void loopUntilSent(int str) {
    int rtn = uBit.serial.send(str);
    while(rtn == MICROBIT_SERIAL_IN_USE) {
       uBit.sleep(0); // let other tasks run
       rtn = uBit.serial.send(str); 
    }
}

#endif 




namespace timeAndDate
{
    /* 
       Return the current system CPU time in s 
    */
    //%
    uint32_t cpuTimeInSeconds() {
        static uint32_t lastUs = 0;
        static uint64_t totalUs = 0;
        uint32_t currentUs = us_ticker_read();

        uint32_t newUs = currentUs - lastUs;
        lastUs = currentUs;
        if(newUs>4294000000) {
#ifdef DEBUG
            loopUntilSent("Oops\nCurrent=");
            loopUntilSent(currentUs);
            loopUntilSent("\nlast=");
            loopUntilSent(lastUs);
            loopUntilSent("\n");
#endif
        }
        // An overflow occurred
        // if(currentUs<0x7FFFFFFF && lastUs>0x7FFFFFFF) {
        //     newUs = 0xFFFFFFFF - lastUs + 1 + currentUs;
        // } else {
        //     newUs = currentUs - lastUs;
        // }
        //  newUs = currentUs - lastUs;
        // // If an error occurred skip this update.  (Should we update lastUs in either case???)
        // // if(newUs < 100*1000000) {
        //      totalUs += newUs;
        //      lastUs = currentUs;
        // // }
        // // Convert uS into seconds
        // // return totalUs / 1000000;
        return totalUs / 1000000;
    }
} // namespace timeAndDate
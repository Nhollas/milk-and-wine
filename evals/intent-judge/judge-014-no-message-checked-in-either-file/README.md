# Nothing checks that no message is sent

B5 says that with no one waiting, offering places "sends no message". The planted messages file has no test for B5, and B5's test in the main file checks only that no offer is made, so code that sends a message when no one is waiting passes.

The judge should report that nothing checks "sends no message".

Tricky because B9's test in the messages file does assert that nothing was sent, for a different Given. The judge has to look in both files, and not count another scenario's test.

@ECHO off
del release.zip
u:\shared\tools\7za a -tzip release.zip picnet.table.filter.min.js demo.htm README.txt
SET /P =New release zip file created. Press Enter to continue...
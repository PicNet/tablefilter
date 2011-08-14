ECHO OFF

REM Please ensure you clone (or svn checkout) the following projects.  I 
REM suggest the same folder (J:\dev\Projects\Misc\...) so that we can all
REM work with the same folder structure / batch file.  The repos 
REM you will need are:
REM git clone /r/picnet/picnet_lib
REM git clone git@github.com:PicNet/picnet_closure_repo.git
REM git clone picnet\closure_compiler picnet_closure_compiler
REM svn checkout https://picnet-closure-library-fork.googlecode.com/svn/trunk/

set CLOSURE_LIB_SOURCE_DIR=J:\dev\Projects\Misc\picnet-closure-library-fork\closure-library
set CLOSURE_COMPILER_SOURCE_DIR=J:\dev\Projects\Misc\picnet_closure_compiler\build\picnetcompiler.jar

set CLOSURE_LIB_TARGET_DIR=lib\closure-library
set CLOSURE_COMPILER_TARGET_DIR=lib\picnetcompiler.jar

rmdir %CLOSURE_LIB_TARGET_DIR%
del %CLOSURE_COMPILER_TARGET_DIR%

mklink /D %CLOSURE_LIB_TARGET_DIR% %CLOSURE_LIB_SOURCE_DIR% && ^
mklink %CLOSURE_COMPILER_TARGET_DIR% %CLOSURE_COMPILER_SOURCE_DIR%

PAUSE

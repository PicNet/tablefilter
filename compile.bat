c:\Python27\python.exe ^
	lib/closure-library/closure/bin/calcdeps.py ^
	-i src/requirements.js ^
	-p lib/closure-library/closure/ ^
	-p src/ ^
	--output_file=picnet.table.filter.min.js ^
	-c lib/picnetcompiler.jar ^
	-f "--compilation_level=ADVANCED_OPTIMIZATIONS" ^
	-f "--debug=true" ^
	-f "--process_closure_primitives=true" ^
	-f "--manage_closure_dependencies=true" ^
	-f "--warning_level=VERBOSE" ^
	-o compiled
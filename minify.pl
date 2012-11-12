#system("java -jar ../closure-compiler/compiler.jar --js=./public/javascripts/index.js --js_output_file=./public/javascripts/index.min.js");

system("java -jar ../closure-compiler/compiler.jar --js=./public/javascripts/excursion.js --js_output_file=./public/javascripts/excursion.min.js");

#system("java -jar ../closure-compiler/compiler.jar --js=./public/javascripts/all.js --js_output_file=./public/javascripts/all.min.js");
#system("java -jar ../closure-compiler/compiler.jar --js=./public/javascripts/socket.io.client.js --js_output_file=./public/javascripts/socket.io.client.min.js");
print "Done.";
<>;
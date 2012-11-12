#$ENV{NODE_ENV}='prodaction';
$ENV{NODE_ENV}='development';

system("supervisor -w .,public/javascripts,views,node_modules app.js");
<>;

#!/usr/bin/env perl
use strict;
use warnings;
use LWP::Simple;
use WebService::Solr;
use Data::Dumper;
use JSON;
use MongoDB;
use MongoDB::OID;
use Params::Classify 0.000 qw(is_string);

our $solrhqApiKey = '061643c0225f5b73eec64227b491f6a2';
our $solrhqInstanceName = 'blog';
our %associations = (
	'_id' => 'id', # The primary/unique key
	'title' => 'title_t' ,
	'text' => 'text_t'
);
our ($mysqlFieldName, $solrFieldName, $mysqlFieldValue);
our @docs = ();
our @fields = ();

my $requestUrl = "http://api.solrhq.com/txt/$solrhqApiKey/start-session/$solrhqInstanceName/";
my $solrUrl = get($requestUrl);
$solrUrl =~ s/\s+$//;
die __LINE__."Error: Couldn't get $requestUrl\nCheck the API Key\n" unless substr($solrUrl,0,4) eq "http";

my $solr = WebService::Solr->new($solrUrl);

my $connection = MongoDB::Connection->new(
    host => 'mongodb://staff.mongohq.com:10043',  
    username => 'nodejitsu', 
    password => '4eecd4149dccaabfb7ef068439c86e61', 
    db_name => 'nodejitsudb454086444279'
);
$connection->connect;
my $database   = $connection->nodejitsudb454086444279;
my $collection = $database->get_collection('blogs');
my $cursor = $collection->find();
while (my $row = $cursor->next)
{
	my @fields = ();

	my $idFound = 0;
	while (($mysqlFieldName, $solrFieldName) = each(%associations)) {
		$mysqlFieldValue = $row->{$mysqlFieldName};
		
		next unless defined $mysqlFieldValue; # Don't add null fields

		# Remove illegal characters (currently char codes 12 (form feed) and 16)
		# You can add more characters as necessary or replace/remove individual characters with tr/
		$mysqlFieldValue =~ s/\f|\x10//g;
		$mysqlFieldValue =~ s/!//g;

		if($solrFieldName eq 'id')
		{
			$idFound = 1;
			$mysqlFieldValue = $mysqlFieldValue->to_string;
		}
		die __LINE__."Not SCALAR" unless(is_string($mysqlFieldValue));
		my $field = WebService::Solr::Field->new($solrFieldName => $mysqlFieldValue);
		
		push(@fields,$field); 

		print $row->{'_id'}."\n";#"SOLR:$solrFieldName=$mysqlFieldValue\n";
	}
	
	my $doc = WebService::Solr::Document->new(@fields);

	@docs = ($doc);
	$solr->add(@docs);
}

print "Adding/Updating ".@docs." docs...\n";

$solr->optimize();

print "Success\n";

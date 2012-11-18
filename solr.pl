#!/usr/bin/env perl
#
# Push data from a MySQL DB to a SolrHQ instance. Set your DB credentials and your SolrHQ API
# Key. Then set the table name and the field associations between MySQL and Solr.  ou can supply a
# last-modified date field and format (MySQL Datetime and UNIX Timestamp). Run the script and the
# your Solr index will be updated.
# 
#
# 2010-0705 JeffP - Initial version
# 2010-0706 JeffP - Added solr->optimize() at the end
# 2010-0710 RR - Add prefix to db record id field
# 2010-0908 RR - change to text block into
#

# Format: (like email headers)
# START
# fieldname: 
#   (indent if field contiuation
# END

use strict;
use warnings;

use LWP::Simple;
use WebService::Solr;
use Data::Dumper;
use JSON;


# Requre the configurations file
#if(!@ARGV) {
#	print "cmd: $0 CONFIG-FILE TEXT-DATE-FILE\n";
#	exit;
#}
my $debugCnt = 0;

#require $ARGV[0];
#my $textinFile = $ARGV[1];
#my $docIdBase = $ARGV[2];

# Declare the variables from the configuration file to bring them into this scope
our $solrhqApiKey = '061643c0225f5b73eec64227b491f6a2';
our $solrhqInstanceName = 'blog';
our $dataFilename = './text2solr.dat';
our $lastModifiedField = '';# If this is blank all data will be added/updated on every run
our $lastModifiedFieldFormat = 'datetime';
our %associations = (
#	'id'=>'id', # The primary/unique key
	'h' => 'title_t' ,
	't' => 'text_t' ,
);
our ($id_field, $id_prefix);
our ($mysqlFieldName, $solrFieldName, $mysqlFieldValue);
our @docs = ();
our @fields = ();

sub addField {
	my ($fname, $fvalue);
	my $field = WebService::Solr::Field->new(
		$fname => $fvalue);				 
	push(@fields,$field); 
}

# Read the lastUpdateTime from the data file (if it exists)
# Open the file with '+>>' to try to create the file if it doesn't exist
# and verify that it's writable if it does
#open FILE,'+>>',$dataFilename or die $!;
#seek FILE,0,0;

#my $lastUpdateTime = <FILE>;
#$lastUpdateTime =~ s/\s+$// if defined $lastUpdateTime;

close FILE;

#Get URL for Solr Instance
my $requestUrl = "http://api.solrhq.com/txt/$solrhqApiKey/start-session/$solrhqInstanceName/";
my $solrUrl = get($requestUrl);

$solrUrl =~ s/\s+$//;

die __LINE__."Error: Couldn't get $requestUrl\nCheck the API Key\n" unless substr($solrUrl,0,4) eq "http";

my $solr = WebService::Solr->new($solrUrl);

my $docnum = 1;

## my $mysqlDatetimeNow = $query->fetchrow;
my $mysqlDatetimeNow = localtime;

## if ($lastModifiedField && $lastUpdateTime) {
## 	$queryString .= <<END;
## 		WHERE $lastModifiedField > '$lastUpdateTime'
## END
## }



## $query = $db->query($queryString) or die __LINE__.": MySQL Error - Please verify field names and table name:\n$queryString\n";

#open(INFILE, $textinFile) || die("ERROR: Input file $textinFile: @!");

# Add row from DB to Solr
#-------------------------------------------------------------------------------
open(my $f,"<2perl.json");my $s='';$s.=$_ while(<$f>);close($f);
my $p = JSON->new->allow_nonref->decode($s);
my $ind = 0;
foreach my $row (@{$p})
{
	$ind++;
	my $title = JSON->new->allow_nonref->encode($row->{'h'});
	my $text = JSON->new->allow_nonref->encode($row->{'t'});

	my @fields = ();

	my $idFound = 0;
	while (($mysqlFieldName, $solrFieldName) = each(%associations)) {
		$mysqlFieldValue = $row->{$mysqlFieldName};
		
		next unless defined $mysqlFieldValue; # Don't add null fields

		if($id_field && $mysqlFieldName eq $id_field) {
			$mysqlFieldValue = $id_prefix . $mysqlFieldValue
		}
		if(defined(&assoc_filter)) {
			# 
			assoc_filter();
		}

		# Remove illegal characters (currently char codes 12 (form feed) and 16)
		# You can add more characters as necessary or replace/remove individual characters with tr/
		$mysqlFieldValue =~ s/\f|\x10//g;
		$mysqlFieldValue =~ s/!//g;

		$idFound = 1 if($solrFieldName eq 'id');		
		my $field = WebService::Solr::Field->new(
			$solrFieldName => $mysqlFieldValue);
		push(@fields,$field); 

		print "SOLR:$docnum:$solrFieldName=$mysqlFieldValue\n";
#		print @fields;
	}

	if(!$idFound) {
		my $field = WebService::Solr::Field->new(
			'id' => $ind.'');
		push(@fields,$field); 
		
	}
	#if(defined(&extra_fields)) {
	#	extra_fields(\%row);
	#}

	my $doc = WebService::Solr::Document->new(@fields);

#	push(@docs, $doc);

	@docs = ($doc);
	$solr->add(@docs);

	++$docnum;

	last if($debugCnt && --$debugCnt == 0);		# debug - do one
}

my $num_docs = @docs;

if ($num_docs > 0) {
	print "Adding/Updating $num_docs docs...\n";
}
else {
	print "No docs to update\n";
}

#$solr->add(\@docs);

$solr->optimize();

open FILE,'>',$dataFilename or die $!;
print FILE $mysqlDatetimeNow;
close FILE;

print "Success\n";

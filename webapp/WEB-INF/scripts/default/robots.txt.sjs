if (acre.current_script === acre.request.script) {
	acre.response.status = 200;
	acre.response.content_type = 'text/plain';

	acre.write("User-agent: * \n");
	acre.write("Disallow: /acre/ \n");
}

# California Parks

## Description
Full stack web app that is like a social media site for California parks. Users can register to create their account, create posts that they can upload pictures of parks, write a brief description of a park, add location of the park, and (if they choose) delete their post. With the location calls are made to Google Maps and Yahoo Weather to display the location and weather in the post. In addition, users can comment on other users' posts as long as they are logged in, but cannot delete others' posts.

The frontend uses Bootstrap, HTML, CSS. The backend uses Node.js with an Express server, Mongo database + Mongoose, Cloudify for image upload and display, Passport for security, calls to Google Map API & Yahoo Weather API, and a variety of different libraries & API's (Body Parser, View EJS, Method Override, Connect Flash, etc, etc) for different features. 


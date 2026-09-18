import httpx
client_id='kimne78kx3ncx6brgo4mv6wki5h1ko'
q={'query': 'query{user(login:"ibai"){stream{archiveVideo{id}} videos(first:5){edges{node{id status}}}}}'}
print(httpx.post('https://gql.twitch.tv/gql', headers={'Client-ID': client_id}, json=q).json())

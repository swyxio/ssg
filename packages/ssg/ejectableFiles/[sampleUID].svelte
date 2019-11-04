<script context="module">
  export async function preload({ params, query }) {
    let key = "ssgCoreData"; // the key of the data, based on the plugin name. if you're using the default markdown plugin, it's "ssgCoreData"
    let uid = "index"; // give "index" for index, or specific uid based on the index
    let dataIndex = await this.ssgData()

    const post = dataIndex.find(item => {
      // change this if you change the filename
      // match based on UID
      // makes for ugly URLs for now
      return item.uid === params.sampleUID;
    });
    if (res.status === 200) {
      return this.ssgData(key, post.uid)
    } else {
      this.error(res.status, data.message);
    }
  }
</script>

<script>
  export let data;
</script>

<h1>Sample Page</h1>
{@html data.html}

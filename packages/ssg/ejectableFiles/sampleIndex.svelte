<script context="module">
  export async function preload({ params, query }) {
    // let key = "ssgCoreData"; // the key of the data, based on the plugin name. if you're using the default markdown plugin, it's "ssgCoreData"
    // let uid = "index"; // give "index" for index, or specific uid based on the index
    return this.ssgData()
      .catch(err => {
        this.error(500, err.message);
      });
  }
</script>

<script>
  export let data;
</script>

<h1>Sample Page</h1>
<pre>{JSON.stringify(data, null, 2)}</pre>

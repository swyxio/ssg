<script context="module">
  export async function preload({ params, query }) {
    let data;
    data = await this.ssgData({ id: params.sampleUID });
    return { data };
  }
</script>

<script>
  export let data;
</script>

<h1>Sample Page</h1>
{@html data.html}

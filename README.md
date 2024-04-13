# <a href="https://sakurajima.moe/@dotmoe">.MOE</a>
<img src="https://raw.githubusercontent.com/HaruByte/assets/main/dotMOE/dotMOE.png" align="right" width="100" height="100">
<p>
  .MOE is a Mastodon account that focuses on providing cute and moe stuff powered by the community.
  <br>
  .MOE uses webhooks from social media accounts that share the same mission, which we refer to as "Providers".
  Any posts from Providers registered with .MOE will be "mirrored" to the official <a href="https://sakurajima.moe/@dotmoe">.MOE Mastodon account</a>.
</p>

## Supported Platforms
- Facebook Page

Other platforms will be supported if there is demand.

## Host Your Own
.MOE requires [Bun](https://bun.sh) to run properly. Node.js will not work due to the use of Bun's built-in modules. \
Also, `cwebp` is needed for image compression. The installation method on Arch Linux is like `sudo pacman -S libwebp` or on Ubuntu `sudo apt install libwebp`.
1. Clone this repo first.
```
git clone https://github.com/Volkadot/dotMOE.git
```
2. Enter the repo directory and install the required dependencies.
```
bun install
```
3. Rename the `.env.example` file to `.env` and edit the variables in the file.
   - `TOKEN` is your Mastodon app's private token. Go to [this website](https://www.make.com/en/help/app/mastodon) for tutorial how to create the app. Make sure you provide `read` and `write` scope.
   - `AUTH_TOKEN` is a random token to pair the Facebook Webhook server to your receiver. Make sure this token is hard to figure out so that no other webhooks connect to your receiver.
   - `APP_TOKEN` is your Facebook application token. This is needed for post payload validation.
   - `VISIBILITY` is the visibility of the post. It can be `public`, `private`, `direct`, and `unlisted`. If this variable does not exist, `public` will be used by default.
4. Run the setup to initiate. This only needs to be run once unless you want to add a new page token.
```
bun run dev:setup
```
5. Then enter your Facebook page token. [Check this out](https://github.com/Volkadot/dotMOE/blob/24c4ba5b80c044b42181910a4bc5f7664221eb16/src/setup.ts#L20C1-L25C66) for a tutorial on how to get page token.
6. Now you are ready to go!

## License
```
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### This project is hosted by
<a href="https://alwaysdata.com"><img src="https://www.alwaysdata.com/static/svg/alwaysdata-logo-pink.svg" width="200" height="auto" alt="Alwaysdata"></a>
